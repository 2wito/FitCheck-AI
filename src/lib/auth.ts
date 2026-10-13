import "server-only";

import type { User as AuthUser } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { LOGIN_PATH } from "@/lib/auth-routes";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

// Read-only check for rendering and reads: the signed-in user's id, verified from the
// session JWT. Every query and action scopes its data to this id.
export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims.sub ?? null;
}

// For protected pages: the user's id, or a redirect to sign-in. The proxy normally
// redirects first; this is the defense in depth if a page is ever reached without a session.
export async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) redirect(LOGIN_PATH);
  return userId;
}

// Signed-in user's email for display (header), or null when signed out.
export async function getCurrentUserEmail(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims.email as string | undefined) ?? null;
}

// Creates or updates the Prisma profile row for a Supabase Auth user. Called after every
// successful sign-in, so the row exists before the user's first write.
export async function syncUser(authUser: AuthUser) {
  const metadata = authUser.user_metadata ?? {};
  const profile = {
    email: authUser.email ?? `${authUser.id}@users.noreply`,
    name: (metadata.full_name ?? metadata.name ?? null) as string | null,
    avatarUrl: (metadata.avatar_url ?? metadata.picture ?? null) as string | null,
  };

  return prisma.user.upsert({
    where: { id: authUser.id },
    update: profile,
    create: { id: authUser.id, ...profile },
  });
}

// For mutations: the signed-in user's profile row (synced on demand as a safety net).
export async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("You must be signed in");

  const existing = await prisma.user.findUnique({ where: { id: data.user.id } });
  return existing ?? syncUser(data.user);
}
