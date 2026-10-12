"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/closet", label: "Closet" },
  { href: "/outfits", label: "Outfits" },
  { href: "/outfits/builder", label: "Create" },
  { href: "/profile", label: "Profile" },
];

export function SiteHeader() {
  const pathname = usePathname();
  // The most specific matching link wins, so /outfits/builder highlights "Create" only.
  const active = LINKS.filter((link) => pathname.startsWith(link.href)).at(-1)?.href;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/closet" className="flex items-center gap-1.5 font-semibold tracking-tight">
          <Sparkles className="size-4" />
          <span className="max-sm:sr-only">FitCheck AI</span>
        </Link>
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
      </div>
    </header>
  );
}
