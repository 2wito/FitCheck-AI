"use client";

import Image from "next/image";
import { CalendarCheck, Shirt } from "lucide-react";

import { ItemQuickActions } from "@/components/closet/item-actions";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ITEM_TYPE_LABEL, SEASON_LABELS, itemImageUrl } from "@/lib/clothing";
import { formatLastWorn } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { ClosetItem, WearStats } from "@/types";

// Uniform tiles: framed pictures share one 4:5 canvas, so every item of a type lines up.
const GRID_CLASSES = "grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4 xl:grid-cols-5";

export function MasonryGrid({
  items,
  onEdit,
  onDelete,
}: {
  items: ClosetItem[];
  onEdit: (item: ClosetItem) => void;
  onDelete: (item: ClosetItem) => void;
}) {
  return (
    <ul className={GRID_CLASSES}>
      {items.map((item) => (
        <li key={item.id}>
          <ClothingCard item={item} onEdit={onEdit} onDelete={onDelete} />
        </li>
      ))}
    </ul>
  );
}

function ClothingCard({
  item,
  onEdit,
  onDelete,
}: {
  item: ClosetItem;
  onEdit: (item: ClosetItem) => void;
  onDelete: (item: ClosetItem) => void;
}) {
  const colors = [item.color, item.secondaryColor].filter(Boolean).join(" / ");

  return (
    <article className="group flex flex-col gap-2">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-b from-card to-muted ring-1 ring-foreground/5 transition-shadow duration-200 group-hover:shadow-lg group-hover:shadow-foreground/5">
        <Image
          src={itemImageUrl(item)}
          alt={item.name}
          fill
          sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="object-contain p-3 transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <ItemQuickActions
          item={item}
          onEdit={onEdit}
          onDelete={onDelete}
          className="absolute top-2 right-2"
        />
      </div>
      <div className="flex flex-col gap-1 px-0.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 font-sans text-sm leading-snug font-medium">{item.name}</h3>
          <Badge variant="secondary" className="shrink-0">
            {ITEM_TYPE_LABEL[item.type]}
          </Badge>
        </div>
        <p className="truncate text-xs text-muted-foreground capitalize">
          {[colors, SEASON_LABELS[item.season], item.style].filter(Boolean).join(" · ")}
        </p>
        <WearBadge wear={item.wear} />
      </div>
    </article>
  );
}

// "Worn 4× · last 2 days ago" / "Not worn yet".
export function WearBadge({ wear, className }: { wear: WearStats; className?: string }) {
  return (
    <p
      className={cn("flex items-center gap-1 text-xs text-muted-foreground", className)}
      // "Last worn" depends on the viewer's local date, which can differ from the server's.
      suppressHydrationWarning
    >
      <CalendarCheck className="size-3 shrink-0" />
      {wear.count === 0 || !wear.lastWornAt
        ? "Not worn yet"
        : `Worn ${wear.count}× · last ${formatLastWorn(wear.lastWornAt)}`}
    </p>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Shirt className="size-6 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}


export function ClothingGridSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-full max-w-2xl" />
      <div className={GRID_CLASSES}>
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton key={i} className="aspect-[4/5] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
