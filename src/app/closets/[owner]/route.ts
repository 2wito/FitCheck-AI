import { NextResponse, type NextRequest } from "next/server";

import { CLOSET_COOKIE, isDemoClosetKey } from "@/lib/auth-mode";

// Picks which closet is open, then opens it. /closets/twito and /closets/shaked open an
// example closet; /closets/mine goes back to the visitor's own. A plain link, so a closet can
// be shared directly.
export async function GET(request: NextRequest, { params }: { params: Promise<{ owner: string }> }) {
  const { owner } = await params;
  const response = NextResponse.redirect(new URL("/closet", request.url));

  if (owner === "mine") {
    response.cookies.delete(CLOSET_COOKIE);
  } else if (isDemoClosetKey(owner)) {
    response.cookies.set(CLOSET_COOKIE, owner, {
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}
