"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, LayoutGrid, Palette, Shirt, Shuffle } from "lucide-react";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/closet", label: "Closet", icon: Shirt },
  { href: "/outfits", label: "Outfits", icon: LayoutGrid },
  { href: "/outfits/mix", label: "Mix & Match", short: "Mix", icon: Shuffle },
  { href: "/outfits/builder", label: "Create", icon: Palette },
  { href: "/planner", label: "Planner", icon: CalendarDays },
];

// The most specific matching link wins, so /outfits/builder highlights "Create" only.
function useActiveHref() {
  const pathname = usePathname();
  return LINKS.filter((link) => pathname.startsWith(link.href)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0]?.href;
}

// Top navigation, from tablet width up. Phones use the bottom tab bar instead.
export function NavLinks() {
  const active = useActiveHref();

  return (
    <nav className="flex items-center gap-1 max-md:hidden" aria-label="Main">
      {LINKS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          aria-current={active === href ? "page" : undefined}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm transition-colors duration-200 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            active === href
              ? "bg-accent font-medium text-accent-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

// Phone navigation: fixed to the bottom (in thumb reach), clear of the home indicator.
export function MobileTabBar() {
  const active = useActiveHref();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="flex">
        {LINKS.map(({ href, label, short, icon: Icon }) => (
          <li key={href} className="flex-1">
            <Link
              href={href}
              aria-current={active === href ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs transition-colors duration-200 outline-none focus-visible:bg-muted",
                active === href ? "font-semibold text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className={cn("size-5", active === href && "stroke-[2.5]")} aria-hidden />
              {short ?? label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
