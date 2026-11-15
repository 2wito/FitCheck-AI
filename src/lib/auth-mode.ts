// Auth switch. Sign-in is ON by default: every request needs a Supabase session and all
// data is scoped to that user. Setting AUTH_ENABLED="false" (and redeploying) opts into open
// "demo mode": no login, and every request acts as one of the shared DEMO_CLOSETS below.
//
// WARNING: in demo mode anyone with the URL can view and change the shared closets and use
// the AI and search quotas. Never use it for a public deployment.

export const AUTH_ENABLED = process.env.AUTH_ENABLED !== "false";

// The shared demo closets (demo mode only). Each is its own User row, so items, outfits,
// sections, plans and wear history are stored separately per closet (all scoped by userId).
export const DEMO_CLOSETS = {
  twito: {
    id: "00000000-0000-4000-8000-000000000001",
    email: "dev@fitcheck.local",
    name: "TWITO'S CLOSET",
    gender: "male",
  },
  shaked: {
    id: "00000000-0000-4000-8000-000000000002",
    email: "shaked@fitcheck.local",
    name: "SHAKED'S CLOSET",
    gender: "female",
  },
} as const;

export type DemoClosetKey = keyof typeof DEMO_CLOSETS;
export type DemoCloset = (typeof DEMO_CLOSETS)[DemoClosetKey];

export const DEFAULT_CLOSET: DemoClosetKey = "twito";
// Cookie holding the selected demo closet key.
export const CLOSET_COOKIE = "fitcheck-closet";

export function isDemoClosetKey(value: string | undefined): value is DemoClosetKey {
  return value !== undefined && Object.hasOwn(DEMO_CLOSETS, value);
}

// Kept for older imports: the default demo closet.
export const DEV_USER = DEMO_CLOSETS[DEFAULT_CLOSET];
