import "server-only";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

// TEMPORARY: sign-in isn't built yet. In development only, requests without a session act
// as this demo user so the closet can be tested. Remove once auth ships.
const DEV_USER = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "dev@fitcheck.local",
  name: "Dev User",
};

const devFallbackEnabled = process.env.NODE_ENV === "development";

async function getAuthUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

// Read-only check for rendering: who is viewing, without touching the database.
export async function getCurrentUserId(): Promise<string | null> {
  const user = await getAuthUser();
  if (user) return user.id;
  return devFallbackEnabled ? DEV_USER.id : null;
}

// For mutations: returns the profile row, creating it on first use.
export async function requireUser() {
  const authUser = await getAuthUser();
  const profile = authUser
    ? { id: authUser.id, email: authUser.email ?? `${authUser.id}@users.noreply` }
    : devFallbackEnabled
      ? DEV_USER
      : null;

  if (!profile) throw new Error("You must be signed in");

  return prisma.user.upsert({
    where: { id: profile.id },
    update: {},
    create: profile,
  });
}
