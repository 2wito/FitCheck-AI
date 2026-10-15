// Route rules shared by the proxy, auth actions and the OAuth callback.

export const LOGIN_PATH = "/login";
export const DEFAULT_AUTHED_PATH = "/closet";

const PROTECTED_PREFIXES = ["/closet", "/outfits", "/planner"];

export function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

// Only same-site relative paths are allowed as post-login destinations; anything else
// (absolute URLs, protocol-relative "//evil.com", backslash tricks) falls back to the default.
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return DEFAULT_AUTHED_PATH;
  }
  return next;
}
