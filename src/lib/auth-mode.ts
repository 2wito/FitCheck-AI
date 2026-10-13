// Auth bypass switch. While AUTH_ENABLED isn't "true", the app runs in open "demo mode":
// no login, no route protection, and every request acts as the shared DEV_USER below.
// All Supabase Auth code stays in place; set AUTH_ENABLED="true" (and redeploy) to turn it back on.
//
// WARNING: in demo mode anyone with the URL can view and change the shared closet and use
// the AI and search quotas. Don't leave it on for a public launch.

export const AUTH_ENABLED = process.env.AUTH_ENABLED === "true";

export const DEV_USER = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "dev@fitcheck.local",
  name: "Dev User",
} as const;
