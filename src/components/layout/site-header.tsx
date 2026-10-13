import { Suspense } from "react";
import Link from "next/link";
import { LogOut, Sparkles } from "lucide-react";

import { signOut } from "@/actions/auth";
import { NavLinks } from "@/components/layout/nav-links";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUserEmail } from "@/lib/auth";
import { AUTH_ENABLED } from "@/lib/auth-mode";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-1.5 font-semibold tracking-tight">
          <Sparkles className="size-4" />
          <span className="max-sm:sr-only">FitCheck AI</span>
        </Link>
        {/* Reads the session cookie, so it streams in after the static shell. */}
        <Suspense fallback={null}>
          <HeaderActions />
        </Suspense>
      </div>
    </header>
  );
}

async function HeaderActions() {
  if (!AUTH_ENABLED) {
    return (
      <div className="flex items-center gap-1 sm:gap-3">
        <NavLinks />
        <Badge
          variant="outline"
          className="max-sm:hidden"
          title="Sign-in is turned off; everyone shares one closet."
        >
          Demo mode
        </Badge>
      </div>
    );
  }

  const email = await getCurrentUserEmail();

  if (!email) {
    return (
      <Button size="sm" nativeButton={false} render={<Link href="/login" />}>
        Sign in
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1 sm:gap-3">
      <NavLinks />
      <form action={signOut} className="flex items-center gap-2 border-l pl-1 sm:pl-3">
        <span className="hidden max-w-40 truncate text-xs text-muted-foreground lg:inline" title={email}>
          {email}
        </span>
        <Button type="submit" variant="ghost" size="icon-sm" aria-label="Sign out" title="Sign out">
          <LogOut />
        </Button>
      </form>
    </div>
  );
}
