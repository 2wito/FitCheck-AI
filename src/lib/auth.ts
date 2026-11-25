import "server-only";

import type { User as AuthUser } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

import {
  AUTH_ENABLED,
  CLOSET_COOKIE,
  DEFAULT_CLOSET,
  DEMO_CLOSETS,
  isDemoClosetKey,
  type DemoClosetKey,
} from "@/lib/auth-mode";
import { LOGIN_PATH } from "@/lib/auth-routes";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

// Two different questions are answered here:
// - Who is signed in? (getSessionUserId) Used for a closet's own settings.
// - Which closet is open for editing? (getCurrentUserId / requireUser) An example closet when
//   the visitor picked one, otherwise the signed-in user's closet. Every query and action for
//   clothes and outfits scopes its data to this id, so nobody can reach another user's closet.

// The signed-in user's id, verified from the session JWT, or null.
export const getSessionUserId = cache(async (): Promise<string | null> => {
  if (!AUTH_ENABLED) return null;
  // Supabase checks the session's expiry against the clock, which is request-time only.
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims.sub ?? null;
});

// The example closet picked by the visitor (cookie), or null for their own closet. Reading the
// cookie also marks the render as per-request, so no closet is prerendered at build time.
export async function getActiveClosetKey(): Promise<DemoClosetKey | null> {
  const value = (await cookies()).get(CLOSET_COOKIE)?.value;
  if (isDemoClosetKey(value)) return value;
  return AUTH_ENABLED ? null : DEFAULT_CLOSET;
}

// The id of the closet open for editing, or null when there's none.
export async function getCurrentUserId(): Promise<string | null> {
  const key = await getActiveClosetKey();
  return key ? DEMO_CLOSETS[key].id : getSessionUserId();
}

// For closet pages: the open closet's id, or a redirect to sign-in. The proxy normally
// redirects first; this is the defense in depth if a page is ever reached without a closet.
export async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) redirect(LOGIN_PATH);
  return userId;
}

// The signed-in user's own closet profile, whichever closet is open. Null when signed out.
export const getSessionProfile = cache(async () => {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      closetName: true,
      slug: true,
      visibility: true,
      gender: true,
      city: true,
      age: true,
      hasLogin: true,
    },
  });
});

export type SessionProfile = NonNullable<Awaited<ReturnType<typeof getSessionProfile>>>;

// Creates or updates the Prisma profile row for a Supabase Auth user. Called after every
// successful sign-in, so the row exists before the user's first write. The name and photo are
// only taken from the provider once: after that they belong to the closet's settings.
export async function syncUser(authUser: AuthUser) {
  const metadata = authUser.user_metadata ?? {};
  const email = authUser.email ?? `${authUser.id}@users.noreply`;

  return prisma.user.upsert({
    where: { id: authUser.id },
    update: { email },
    create: {
      id: authUser.id,
      email,
      name: (metadata.full_name ?? metadata.name ?? null) as string | null,
      avatarUrl: (metadata.avatar_url ?? metadata.picture ?? null) as string | null,
    },
  });
}

// For mutations on the open closet: its profile row (synced on demand as a safety net).
export async function requireUser() {
  const key = await getActiveClosetKey();
  if (key) {
    const { id, email, name } = DEMO_CLOSETS[key];
    return prisma.user.upsert({ where: { id }, update: {}, create: { id, email, name } });
  }
  return requireSessionUser();
}

// For mutations on the signed-in user's own closet, whichever closet is open.
export async function requireSessionUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("You must be signed in");

  const existing = await prisma.user.findUnique({ where: { id: data.user.id } });
  return existing ?? syncUser(data.user);
}
