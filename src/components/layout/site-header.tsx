import { Suspense } from "react";
import Link from "next/link";
import { Plus, Settings, Sparkles } from "lucide-react";

import { MobileTabBar, NavLinks } from "@/components/layout/nav-links";
import { Button } from "@/components/ui/button";
import { getActiveClosetKey, getCurrentUserId, getSessionProfile } from "@/lib/auth";
import { AUTH_ENABLED } from "@/lib/auth-mode";

export function SiteHeader() {
  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-md font-heading text-lg font-bold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50 pointer-coarse:min-h-12 pointer-coarse:min-w-10"
          >
            <Sparkles className="size-4 text-primary" aria-hidden />
            <span className="max-sm:sr-only">FitCheck AI</span>
          </Link>
          {/* Reads the session cookie, so it streams in after the static shell. */}
          <Suspense fallback={null}>
            <HeaderActions />
          </Suspense>
        </div>
      </header>
      {/* Rendered outside <header>: its backdrop-filter would make it the containing block for
          the fixed tab bar, pinning the bar to the header instead of the screen bottom. */}
      <Suspense fallback={null}>
        <MobileNav />
      </Suspense>
    </>
  );
}

// The closet pages' tab bar, once there's a closet open to browse.
async function MobileNav() {
  return (await getCurrentUserId()) ? <MobileTabBar /> : null;
}

async function HeaderActions() {
  const [exampleKey, userId] = await Promise.all([getActiveClosetKey(), getCurrentUserId()]);
  // The header must render even if the database is briefly unreachable.
  const profile = await getSessionProfile().catch(() => null);
  const own = profile?.closetName
    ? { name: profile.closetName, avatarUrl: profile.avatarUrl, gender: profile.gender }
    : null;

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <NavLinks exampleKey={exampleKey} own={own} hasClosetOpen={userId !== null} />
      {profile ? (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Closet settings"
          title="Closet settings"
          nativeButton={false}
          render={<Link href="/settings" />}
        >
          <Settings />
        </Button>
      ) : (
        AUTH_ENABLED && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="max-sm:px-2"
              nativeButton={false}
              render={<Link href="/login" />}
            >
              Sign in
            </Button>
            <Button
              size="sm"
              aria-label="Create your closet"
              title="Create your closet"
              className="max-xl:px-2"
              nativeButton={false}
              render={<Link href="/create" />}
            >
              <Plus data-icon="inline-start" />
              <span className="max-xl:hidden">Create closet</span>
            </Button>
          </>
        )
      )}
    </div>
  );
}
