"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CircleHelp, LayoutGrid, Palette, Shirt, Shuffle } from "lucide-react";

import { ClosetAvatar, genderKey } from "@/components/shared/closet-avatar";
import { CLOSET_THEME } from "@/components/shared/closet-icons";
import { DEMO_CLOSETS, DEMO_CLOSET_KEYS, type DemoClosetKey } from "@/lib/auth-mode";
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

export type OwnCloset = {
  name: string;
  avatarUrl: string | null;
  gender: "MALE" | "FEMALE" | null;
};

// Top navigation. The closet pages' links show on wide screens (smaller ones use the bottom tab
// bar) once a closet is open; the closet switcher and Guide show on every screen size.
export function NavLinks({
  exampleKey,
  own,
  hasClosetOpen,
}: {
  // The open example closet; null when it's the visitor's own (or none).
  exampleKey: DemoClosetKey | null;
  own: OwnCloset | null;
  hasClosetOpen: boolean;
}) {
  const active = useActiveHref();
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1" aria-label="Main">
      {hasClosetOpen && (
        <div className="flex items-center gap-1 max-lg:hidden">
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
      )}
      {hasClosetOpen && <ClosetSwitcher exampleKey={exampleKey} own={own} />}
      <Link
        href="/guide"
        aria-current={pathname === "/guide" ? "page" : undefined}
        className={cn(linkClass(pathname === "/guide"), "max-sm:px-2")}
        title="Guide"
      >
        <CircleHelp className="size-4 md:hidden" aria-hidden />
        <span className="max-md:sr-only">Guide</span>
      </Link>
      <Link
        href="/about"
        aria-current={pathname === "/about" ? "page" : undefined}
        className={cn(linkClass(pathname === "/about"), "max-xl:hidden")}
      >
        About
      </Link>
    </nav>
  );
}

const switcherClass = (selected: boolean) =>
  cn(
    "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold tracking-wide whitespace-nowrap transition-colors duration-200 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 pointer-coarse:min-h-10",
    !selected && "text-muted-foreground hover:bg-muted hover:text-foreground",
  );

// Switches between the visitor's own closet and the example closets. Plain links (full page
// load) to the route that sets the closet cookie, so every page re-renders with that closet.
function ClosetSwitcher({
  exampleKey,
  own,
}: {
  exampleKey: DemoClosetKey | null;
  own: OwnCloset | null;
}) {
  return (
    <div
      role="group"
      aria-label="Choose closet"
      className="flex items-center gap-0.5 rounded-lg border bg-background/60 p-0.5"
    >
      {own && (
        // eslint-disable-next-line @next/next/no-html-link-for-pages
        <a
          href="/closets/mine"
          aria-current={exampleKey === null ? "true" : undefined}
          title={own.name}
          className={cn(
            switcherClass(exampleKey === null),
            exampleKey === null && "bg-foreground text-background",
          )}
        >
          <ClosetAvatar
            src={own.avatarUrl}
            name={own.name}
            gender={genderKey(own.gender)}
            className="size-5 text-[10px]"
          />
          <bdi className="max-w-28 truncate max-sm:sr-only">{own.name}</bdi>
        </a>
      )}
      {DEMO_CLOSET_KEYS.map((key) => {
        const { name, gender } = DEMO_CLOSETS[key];
        const theme = CLOSET_THEME[gender];
        const selected = key === exampleKey;
        return (
          <a
            key={key}
            href={`/closets/${key}`}
            aria-current={selected ? "true" : undefined}
            title={`${name} (example)`}
            className={cn(switcherClass(selected), selected && theme.selected)}
          >
            <theme.Icon className={cn("size-4", !selected && theme.icon)} />
            <span className="sr-only">{name} (example)</span>
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
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
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
