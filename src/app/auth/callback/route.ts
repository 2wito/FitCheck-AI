import { NextResponse, type NextRequest } from "next/server";

import { syncUser } from "@/lib/auth";
import { LOGIN_PATH, safeNextPath } from "@/lib/auth-routes";
import { createClient } from "@/lib/supabase/server";

// Landing point for Google OAuth and email-confirmation links: trades the one-time code
// for a session cookie, syncs the Prisma user row, then continues to `next`.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      await syncUser(data.user);
      return NextResponse.redirect(new URL(next, origin));
    }
    console.error("Auth callback failed", error);
  }

  const loginUrl = new URL(LOGIN_PATH, origin);
  loginUrl.searchParams.set("error", "That sign-in link is invalid or has expired. Please try again.");
  return NextResponse.redirect(loginUrl);
}
