// Auth switch. Sign-in is ON by default: visitors can create their own closet and sign in to
// it, and may also use the two example closets below without signing in. AUTH_ENABLED="false"
// (and redeploying) is a Supabase-Auth-free "demo mode" with only the example closets.
//
// Everyone can add, edit and delete in the EXAMPLE closets, by design. All other closets can
// only be changed by the user who owns them.

export const AUTH_ENABLED = process.env.AUTH_ENABLED !== "false";

type DemoClosetInfo = {
  id: string;
  email: string;
  name: string;
  owner: string;
  // Path of a file in /public (e.g. "/closets/twito.webp"); null shows the figure icon.
  avatarUrl: string | null;
  gender: "male" | "female";
};

// The shared example closets. Each is its own User row, so items, outfits, sections, plans
// and wear history are stored separately per closet (all scoped by userId). Their name and
// photo are set here rather than in the app, so visitors can't change them.
export const DEMO_CLOSETS: Record<"twito" | "shaked", DemoClosetInfo> = {
  twito: {
    id: "00000000-0000-4000-8000-000000000001",
    email: "dev@fitcheck.local",
    name: "TWITO'S CLOSET",
    owner: "איתי טויטו",
    avatarUrl: null,
    gender: "male",
  },
  shaked: {
    id: "00000000-0000-4000-8000-000000000002",
    email: "shaked@fitcheck.local",
    name: "SHAKED'S CLOSET",
    owner: "שקד",
    avatarUrl: null,
    gender: "female",
  },
};

export type DemoClosetKey = keyof typeof DEMO_CLOSETS;
export const DEMO_CLOSET_KEYS = Object.keys(DEMO_CLOSETS) as DemoClosetKey[];
export const DEMO_CLOSET_IDS = DEMO_CLOSET_KEYS.map((key) => DEMO_CLOSETS[key].id);

export const DEFAULT_CLOSET: DemoClosetKey = "twito";
// Cookie holding the selected example closet's key. Absent: the visitor's own closet.
export const CLOSET_COOKIE = "fitcheck-closet";

export function isDemoClosetKey(value: string | undefined): value is DemoClosetKey {
  return value !== undefined && Object.hasOwn(DEMO_CLOSETS, value);
}
