import { NextResponse, type NextRequest } from "next/server";

import { AUTH_ENABLED, CLOSET_COOKIE, isDemoClosetKey } from "@/lib/auth-mode";

// Selects a demo closet (/closets/twito, /closets/shaked) and opens it. A plain link, so a
// closet can be shared directly: whoever opens /closets/shaked lands in Shaked's closet.
export async function GET(request: NextRequest, { params }: { params: Promise<{ owner: string }> }) {
  const { owner } = await params;
  const response = NextResponse.redirect(new URL("/closet", request.url));

  // With sign-in on, everyone has their own closet; there's nothing to switch.
  if (AUTH_ENABLED || !isDemoClosetKey(owner)) return response;

  response.cookies.set(CLOSET_COOKIE, owner, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
