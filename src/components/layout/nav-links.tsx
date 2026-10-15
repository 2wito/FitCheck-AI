"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/closet", label: "Closet" },
  { href: "/outfits", label: "Outfits" },
  { href: "/outfits/builder", label: "Create" },
  { href: "/planner", label: "Planner" },
];

export function NavLinks() {
  const pathname = usePathname();
  // The most specific matching link wins, so /outfits/builder highlights "Create" only.
  const active = LINKS.filter((link) => pathname.startsWith(link.href)).at(-1)?.href;

  return (
    <nav className="flex items-center gap-0.5 sm:gap-1" aria-label="Main">
      {LINKS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          aria-current={active === href ? "page" : undefined}
          className={cn(
            "rounded-md px-2.5 py-1.5 text-sm transition-colors sm:px-3",
            active === href
              ? "bg-muted font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
