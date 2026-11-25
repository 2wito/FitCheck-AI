"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Prisma } from "@/generated/prisma/client";
import { getSessionUserId, requireSessionUser } from "@/lib/auth";
import { AUTH_ENABLED, CLOSET_COOKIE } from "@/lib/auth-mode";
import { uniqueSlug } from "@/lib/closets";
import { prisma } from "@/lib/prisma";
import { closetPathFromUrl, removeImages, uploadImage } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { readImageFile } from "@/lib/uploads";
import { consumeUsage, visitorKey } from "@/lib/usage";
import {
  createClosetSchema,
  loginSchema,
  profileSchema,
  type ClosetProfile,
} from "@/lib/validations/closet-profile";

// A visitor's own closet: creating it, its settings, and deleting it. These always act on the
// signed-in user, never on the example closet that may be open.

export type ClosetFormState = { error?: string; message?: string } | null;

const CREATION_OFF = "Creating closets is turned off right now.";
const GENERIC_ERROR = "Something went wrong. Please try again.";
const EMAIL_TAKEN = "This email already has a closet. Sign in instead.";
const MAX_AVATAR_BYTES = 1_000_000;

// The avatar is cropped and converted to WebP in the browser. Null = none was chosen.
function readAvatar(formData: FormData): File | string | null {
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return null;
  const image = readImageFile(formData, "avatar");
  if (typeof image !== "string" && image.size > MAX_AVATAR_BYTES) return "The photo is too large";
  return image;
}

async function saveAvatar(userId: string, file: File) {
  const extension = { "image/webp": "webp", "image/png": "png" }[file.type] ?? "jpg";
  return uploadImage(`${userId}/avatar/${Date.now()}.${extension}`, file, file.type);
}

// Saves the profile, giving a new closet its address. The address can be taken between the
// check and the write, so that's retried.
async function saveProfile(
  userId: string,
  profile: ClosetProfile,
  currentSlug: string | null,
  extra: { avatarUrl?: string | null; hasLogin?: boolean } = {},
) {
  for (let attempt = 0; ; attempt++) {
    try {
      const slug = currentSlug ?? (await uniqueSlug(profile.closetName));
      return await prisma.user.update({
        where: { id: userId },
        data: { ...profile, ...extra, slug },
      });
    } catch (error) {
      const slugTaken =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!slugTaken || currentSlug || attempt >= 2) throw error;
    }
  }
}

function refreshClosetPages() {
  revalidatePath("/", "layout");
}

export async function createCloset(
  _prev: ClosetFormState,
  formData: FormData,
): Promise<ClosetFormState> {
  if (!AUTH_ENABLED) return { error: CREATION_OFF };

  const sessionUserId = await getSessionUserId();
  const parsed = sessionUserId
    ? // Already signed in (an account without a closet yet): no email or password needed.
      profileSchema.safeParse(Object.fromEntries(formData))
    : createClosetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? GENERIC_ERROR };

  const avatar = readAvatar(formData);
  if (typeof avatar === "string") return { error: avatar };

  // Set once a new account exists, so a later failure can remove it again.
  let newUserId: string | null = null;
  try {
    if (sessionUserId) {
      const user = await requireSessionUser();
      if (!user.closetName) {
        const { closetName, name, visibility, gender, city, age } = parsed.data;
        const avatarUrl = avatar ? await saveAvatar(user.id, avatar) : user.avatarUrl;
        await saveProfile(
          user.id,
          { closetName, name, visibility, gender, city, age },
          user.slug,
          { avatarUrl },
        );
      }
    } else {
      const { email, password, ...profile } = parsed.data as ReturnType<
        typeof createClosetSchema.parse
      >;
      if (email && (await prisma.user.findUnique({ where: { email }, select: { id: true } }))) {
        return { error: EMAIL_TAKEN };
      }
      if (!(await consumeUsage("new-closet", await visitorKey()))) {
        return { error: "Too many new closets from your network today. Please try again tomorrow." };
      }

      // Without an email the account gets an internal address and a password nobody knows:
      // this browser's session is the only way in until a login is added in settings.
      const credentials = {
        email: email ?? `closet-${randomUUID()}@closets.fitcheck.local`,
        password: password ?? `${randomUUID()}${randomUUID()}`.slice(0, 72),
      };
      const admin = createAdminClient();
      // email_confirm: no verification email.
      const { data, error } = await admin.auth.admin.createUser({
        ...credentials,
        email_confirm: true,
      });
      if (error || !data.user) {
        if (error?.code === "email_exists") return { error: EMAIL_TAKEN };
        if (error?.code === "weak_password") return { error: "Choose a stronger password." };
        if (error?.code === "validation_failed") return { error: "Enter a valid email address." };
        throw error ?? new Error("No user returned");
      }
      newUserId = data.user.id;

      await prisma.user.create({ data: { id: newUserId, email: credentials.email } });
      const avatarUrl = avatar ? await saveAvatar(newUserId, avatar) : null;
      await saveProfile(newUserId, profile, null, { avatarUrl, hasLogin: Boolean(email) });

      const supabase = await createClient();
      const signedIn = await supabase.auth.signInWithPassword(credentials);
      if (signedIn.error) throw signedIn.error;
    }
  } catch (error) {
    console.error("Failed to create closet", error);
    if (newUserId) await discardAccount(newUserId).catch((e) => console.error(e));
    return { error: GENERIC_ERROR };
  }

  (await cookies()).delete(CLOSET_COOKIE);
  refreshClosetPages();
  redirect("/closet");
}

// Removes an account and everything in it. Storage and auth cleanup are best-effort: once the
// profile row is gone the closet is no longer reachable.
async function discardAccount(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      avatarUrl: true,
      clothingItems: { select: { imageUrl: true, bgRemovedUrl: true, framedUrl: true } },
    },
  });
  await prisma.user.deleteMany({ where: { id: userId } });

  const paths = [
    user?.avatarUrl ?? null,
    ...(user?.clothingItems ?? []).flatMap((i) => [i.imageUrl, i.bgRemovedUrl, i.framedUrl]),
  ]
    .map(closetPathFromUrl)
    .filter((path): path is string => !!path);
  // The storage API takes up to 1000 paths per call.
  for (let i = 0; i < paths.length; i += 500) {
    await removeImages(paths.slice(i, i + 500)).catch((error) => console.error(error));
  }

  const { error } = await createAdminClient().auth.admin.deleteUser(userId);
  if (error) console.error("Failed to remove auth user", userId, error);
}

export async function updateClosetProfile(
  _prev: ClosetFormState,
  formData: FormData,
): Promise<ClosetFormState> {
  if (!(await getSessionUserId())) return { error: "Please sign in again." };

  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? GENERIC_ERROR };
  const avatar = readAvatar(formData);
  if (typeof avatar === "string") return { error: avatar };

  try {
    const user = await requireSessionUser();
    if (parsed.data.visibility === "PRIVATE" && !user.hasLogin) {
      return { error: "Add an email and password below first, then make your closet private." };
    }

    const removeAvatar = formData.get("removeAvatar") === "true";
    const avatarUrl = avatar
      ? await saveAvatar(user.id, avatar)
      : removeAvatar
        ? null
        : user.avatarUrl;
    await saveProfile(user.id, parsed.data, user.slug, { avatarUrl });

    const previous = avatarUrl !== user.avatarUrl ? closetPathFromUrl(user.avatarUrl) : null;
    if (previous) await removeImages([previous]).catch(() => undefined);
  } catch (error) {
    console.error("Failed to update closet profile", error);
    return { error: GENERIC_ERROR };
  }

  refreshClosetPages();
  return { message: "Saved" };
}

// Adds an email and password to a closet that was opened without them.
export async function addLogin(
  _prev: ClosetFormState,
  formData: FormData,
): Promise<ClosetFormState> {
  if (!(await getSessionUserId())) return { error: "Please sign in again." };
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? GENERIC_ERROR };

  try {
    const user = await requireSessionUser();
    // Only for closets without a login: an existing one isn't replaced from here.
    if (user.hasLogin) return { error: "This closet already has an email and password." };

    const { error } = await createAdminClient().auth.admin.updateUserById(user.id, {
      ...parsed.data,
      email_confirm: true,
    });
    if (error) {
      if (error.code === "email_exists") return { error: EMAIL_TAKEN };
      if (error.code === "weak_password") return { error: "Choose a stronger password." };
      throw error;
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { email: parsed.data.email, hasLogin: true },
    });

    // A password change can end existing sessions, so start a fresh one.
    const supabase = await createClient();
    await supabase.auth.signInWithPassword(parsed.data);
  } catch (error) {
    console.error("Failed to add a login", error);
    return { error: GENERIC_ERROR };
  }

  refreshClosetPages();
  return { message: "Done! You can now sign in from any device." };
}

// Permanently deletes the signed-in user's closet, after they typed its name.
export async function deleteCloset(
  _prev: ClosetFormState,
  formData: FormData,
): Promise<ClosetFormState> {
  if (!(await getSessionUserId())) return { error: "Please sign in again." };

  try {
    const user = await requireSessionUser();
    const typed = formData.get("confirm")?.toString().trim();
    if (!user.closetName || typed !== user.closetName) {
      return { error: "Type your closet's name exactly to delete it." };
    }
    await discardAccount(user.id);
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "local" });
  } catch (error) {
    console.error("Failed to delete closet", error);
    return { error: GENERIC_ERROR };
  }

  refreshClosetPages();
  redirect("/");
}
