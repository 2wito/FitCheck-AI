"use client";

import { useState } from "react";
import Image from "next/image";
import { Shirt } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ItemType } from "@/generated/prisma/browser";
import type { ViewableItem } from "@/lib/closets";
import { ITEM_TYPE_LABEL, ITEM_TYPE_LABELS, SEASON_LABELS } from "@/lib/clothing";
import { cn } from "@/lib/utils";
import type { ClosetSection } from "@/types";

// A closet's clothes for visitors: filters and cards, with no actions.
export function ReadOnlyCloset({
  items,
  sections,
}: {
  items: ViewableItem[];
  sections: ClosetSection[];
}) {
  const [filterId, setFilterId] = useState("all");

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed px-6 py-16 text-center">
        <Shirt className="size-8 text-muted-foreground" aria-hidden />
        <p className="font-medium">No clothes here yet. Check back soon!</p>
      </div>
    );
  }

  const filters = [
    { id: "all", label: "All", items },
    ...Object.values(ItemType).map((type) => ({
      id: `type:${type}`,
      label: ITEM_TYPE_LABELS[type],
      items: items.filter((item) => item.type === type),
    })),
    ...sections.map((section) => ({
      id: `section:${section.id}`,
      label: section.name,
      items: items.filter((item) => item.sectionIds.includes(section.id)),
    })),
  ].filter((filter) => filter.items.length > 0);
  const active = filters.find((filter) => filter.id === filterId) ?? filters[0];

  return (
    <div className="flex flex-col gap-5">
      <div
        role="group"
        aria-label="Filter"
        className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
      >
        {filters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            aria-pressed={filter.id === active.id}
            onClick={() => setFilterId(filter.id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors pointer-coarse:min-h-12 pointer-coarse:px-4",
              filter.id === active.id
                ? "border-foreground bg-foreground text-background"
                : "bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground",
            )}
          >
            <bdi>{filter.label}</bdi>
            <span className="text-xs tabular-nums opacity-60">{filter.items.length}</span>
          </button>
        ))}
      </div>

      <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4 xl:grid-cols-5">
        {active.items.map((item) => (
          <li key={item.id} className="flex flex-col gap-2">
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-b from-card to-muted ring-1 ring-foreground/5">
              <Image
                src={item.image}
                alt={item.name}
                fill
                sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                className="object-contain p-3"
              />
            </div>
            <div className="flex flex-col gap-1 px-0.5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="line-clamp-2 font-sans text-sm leading-snug font-medium">
                  <bdi>{item.name}</bdi>
                </h3>
                <Badge variant="secondary" className="shrink-0">
                  {ITEM_TYPE_LABEL[item.type]}
                </Badge>
              </div>
              <p className="truncate text-xs text-muted-foreground capitalize">
                {[
                  [item.color, item.secondaryColor].filter(Boolean).join(" / "),
                  SEASON_LABELS[item.season],
                  item.style,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
