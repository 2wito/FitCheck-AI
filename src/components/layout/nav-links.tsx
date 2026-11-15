"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Info, LayoutGrid, Palette, Shirt, Shuffle } from "lucide-react";

import { CLOSET_THEME } from "@/components/shared/closet-icons";
import { DEMO_CLOSETS, type DemoClosetKey } from "@/lib/auth-mode";
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

const linkClass = (active: boolean) =>
  cn(
    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors duration-200 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 pointer-coarse:min-h-10",
    active
      ? "bg-accent font-medium text-accent-foreground"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );

// Top navigation. The page links show from tablet width up (phones use the bottom tab bar);
// the closet switcher (demo mode only) and About show on every screen size.
export function NavLinks({ activeCloset }: { activeCloset?: DemoClosetKey }) {
  const active = useActiveHref();
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1" aria-label="Main">
      <div className="flex items-center gap-1 max-md:hidden">
        {LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            aria-current={active === href ? "page" : undefined}
            className={linkClass(active === href)}
          >
            {label}
          </Link>
        ))}
      </div>
      {activeCloset && <ClosetSwitcher active={activeCloset} />}
      <Link
        href="/about"
        aria-current={pathname === "/about" ? "page" : undefined}
        className={linkClass(pathname === "/about")}
        title="About"
      >
        <Info className="size-4 md:hidden" aria-hidden />
        <span className="max-md:sr-only">About</span>
      </Link>
    </nav>
  );
}

// Switches between the shared demo closets. Plain links (full page load) to the route that
// sets the closet cookie, so every page re-renders with the newly selected closet's data.
function ClosetSwitcher({ active }: { active: DemoClosetKey }) {
  return (
    <div
      role="group"
      aria-label="Choose closet"
      className="flex items-center gap-0.5 rounded-lg border bg-background/60 p-0.5 md:ml-1"
    >
      {(Object.keys(DEMO_CLOSETS) as DemoClosetKey[]).map((key) => {
        const { name, gender } = DEMO_CLOSETS[key];
        const theme = CLOSET_THEME[gender];
        const selected = key === active;
        return (
          <a
            key={key}
            href={`/closets/${key}`}
            aria-current={selected ? "true" : undefined}
            title={name}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold tracking-wide whitespace-nowrap transition-colors duration-200 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 pointer-coarse:min-h-10",
              selected
                ? theme.selected
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <theme.Icon className={cn("size-4", !selected && theme.icon)} />
            <span className="max-xl:sr-only">{name}</span>
          </a>
        );
      })}
    </div>
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
