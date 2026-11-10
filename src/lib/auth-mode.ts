// Auth switch. Sign-in is ON by default: every request needs a Supabase session and all
// data is scoped to that user. Setting AUTH_ENABLED="false" (and redeploying) opts into open
// "demo mode": no login, and every request acts as the shared DEV_USER below.
//
// WARNING: in demo mode anyone with the URL can view and change the shared closet and use
// the AI and search quotas. Never use it for a public deployment.

export const AUTH_ENABLED = process.env.AUTH_ENABLED !== "false";

// The shared demo closet (demo mode only), shown to visitors as "TWITOS CLOSET".
export const DEV_USER = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "dev@fitcheck.local",
  name: "TWITOS CLOSET",
} as const;
