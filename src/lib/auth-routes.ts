// Route rules shared by the proxy, auth actions and the OAuth callback.

export const LOGIN_PATH = "/login";
export const DEFAULT_AUTHED_PATH = "/closet";

// Need an open closet: an example closet or the signed-in user's own.
const CLOSET_PREFIXES = ["/closet", "/outfits", "/planner"];
// Need a signed-in user, whichever closet is open.
const ACCOUNT_PREFIXES = ["/settings"];

const matches = (pathname: string, prefixes: string[]) =>
  prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

export const isClosetPath = (pathname: string) => matches(pathname, CLOSET_PREFIXES);
export const isAccountPath = (pathname: string) => matches(pathname, ACCOUNT_PREFIXES);

// Only same-site relative paths are allowed as post-login destinations; anything else
// (absolute URLs, protocol-relative "//evil.com", backslash tricks) falls back to the default.
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return DEFAULT_AUTHED_PATH;
  }
  return next;
}
