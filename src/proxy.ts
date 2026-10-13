import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { LOGIN_PATH, isProtectedPath, safeNextPath } from "@/lib/auth-routes";
import { SupabaseConfigError, getSupabaseConfig } from "@/lib/supabase/config";

// Runs before every page request: refreshes the Supabase session cookie, sends signed-out
// visitors of protected pages to /login, and sends signed-in visitors away from /login.
export async function proxy(request: NextRequest) {
  let config: ReturnType<typeof getSupabaseConfig>;
  try {
    config = getSupabaseConfig();
  } catch (error) {
    if (!(error instanceof SupabaseConfigError)) throw error;
    // Without Supabase nothing works; say exactly what's misconfigured instead of a generic crash.
    console.error(`[FitCheck AI] ${error.message}`);
    return new NextResponse(`FitCheck AI is misconfigured.\n\n${error.message}\n`, {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    config.url,
    config.anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          // Refreshed tokens must reach both the page render (request) and the browser (response).
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // Verifies the JWT (and refreshes it if expired). Don't put code between client
  // creation and this call: the session must be resolved before any redirect decision.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const { pathname, search } = request.nextUrl;

  if (!signedIn && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return redirectWithCookies(url, response);
  }

  if (signedIn && pathname === LOGIN_PATH) {
    const url = new URL(safeNextPath(request.nextUrl.searchParams.get("next")), request.url);
    return redirectWithCookies(url, response);
  }

  return response;
}

// A redirect must carry any refreshed session cookies, or the user gets signed out.
function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  matcher: [
    // Everything except static assets, image optimization and the OAuth callback.
    "/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
