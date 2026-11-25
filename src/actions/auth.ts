"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getSessionProfile, syncUser } from "@/lib/auth";
import { CLOSET_COOKIE } from "@/lib/auth-mode";
import { safeNextPath } from "@/lib/auth-routes";
import { createClient } from "@/lib/supabase/server";
import { emailSchema } from "@/lib/validations/closet-profile";

// Shape returned to the auth form via useActionState. On success the actions redirect instead.
// Accounts are made by creating a closet (src/actions/closet-profile.ts).
export type AuthFormState = { error?: string } | null;

const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
});

// The URL the browser is on, so email and OAuth links return to the same deployment.
async function siteOrigin() {
  const h = await headers();
  return h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}

async function callbackUrl(next: string) {
  return `${await siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}`;
}

function friendlyAuthError(message: string) {
  if (/invalid login credentials/i.test(message)) return "Wrong email or password.";
  if (/email not confirmed/i.test(message)) {
    return "Please confirm your email first. Check your inbox for the link.";
  }
  if (/rate limit/i.test(message)) return "Too many attempts. Please wait a minute and try again.";
  return message;
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: friendlyAuthError(error.message) };

  await syncUser(data.user);
  // Open their own closet, even if an example closet was open before.
  (await cookies()).delete(CLOSET_COOKIE);
  revalidatePath("/", "layout");
  redirect(safeNextPath(formData.get("next")?.toString()));
}

export async function signInWithGoogle(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: await callbackUrl(safeNextPath(formData.get("next")?.toString())) },
  });
  if (error || !data.url) return { error: "Google sign-in isn't available right now." };

  redirect(data.url);
}

export async function signOut() {
  // A closet without email and password can't be signed in to again, so signing out would
  // lock its owner out for good. Settings explains how to add a login first.
  const profile = await getSessionProfile();
  if (profile && !profile.hasLogin) redirect("/settings");

  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  revalidatePath("/", "layout");
  redirect("/");
}
