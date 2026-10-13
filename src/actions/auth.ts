"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { syncUser } from "@/lib/auth";
import { LOGIN_PATH, safeNextPath } from "@/lib/auth-routes";
import { createClient } from "@/lib/supabase/server";

// Shape returned to the auth form via useActionState. On success the actions redirect instead.
export type AuthFormState = { error?: string; message?: string } | null;

const signInSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

const signUpSchema = z.object({
  email: z.email("Enter a valid email address"),
  // Supabase's default minimum is 6; 8 is a safer floor. bcrypt ignores bytes past 72.
  password: z.string().min(8, "Use at least 8 characters").max(72, "Use at most 72 characters"),
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
  if (/already registered/i.test(message)) return "An account with this email already exists. Sign in instead.";
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
  revalidatePath("/", "layout");
  redirect(safeNextPath(formData.get("next")?.toString()));
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const next = safeNextPath(formData.get("next")?.toString());

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: await callbackUrl(next) },
  });
  if (error) return { error: friendlyAuthError(error.message) };

  // No session means email confirmation is on: the user finishes via the emailed link.
  if (!data.session || !data.user) {
    return { message: "Check your email for a confirmation link to finish signing up." };
  }

  await syncUser(data.user);
  revalidatePath("/", "layout");
  redirect(next);
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
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect(LOGIN_PATH);
}
