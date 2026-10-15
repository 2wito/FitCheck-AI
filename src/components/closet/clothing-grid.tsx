"use client";

import Image from "next/image";
import { CalendarCheck, Shirt } from "lucide-react";

import { ItemQuickActions } from "@/components/closet/item-actions";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORY_LABELS, SEASON_LABELS } from "@/lib/clothing";
import { formatLastWorn } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { ClosetItem, WearStats } from "@/types";

const MASONRY_CLASSES = "columns-2 gap-4 sm:columns-3 lg:columns-4 xl:columns-5";

// Pinterest-style grid: CSS columns let every photo keep its own aspect ratio.
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
    <ul className={MASONRY_CLASSES}>
      {items.map((item) => (
        <li key={item.id} className="mb-4 break-inside-avoid">
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-muted/40 to-muted/80 p-4 ring-1 ring-foreground/5 transition-shadow group-hover:shadow-lg">
        {/* Intrinsic size is unknown; width/height only reserve space, h-auto keeps the real ratio. */}
        <Image
          src={item.bgRemovedUrl ?? item.imageUrl}
          alt={item.name}
          width={600}
          height={750}
          sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="h-auto w-full transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <ItemQuickActions
          item={item}
          onEdit={onEdit}
          onDelete={onDelete}
          className="absolute top-2 right-2"
        />
      </div>
      <div className="flex flex-col gap-1 px-0.5">
        <h3 className="truncate text-sm font-medium">{item.name}</h3>
        {colors && <p className="truncate text-xs text-muted-foreground capitalize">{colors}</p>}
        <WearBadge wear={item.wear} />
        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary">{CATEGORY_LABELS[item.category]}</Badge>
          <Badge variant="outline">{SEASON_LABELS[item.season]}</Badge>
          {item.style && (
            <Badge variant="outline" className="capitalize">
              {item.style}
            </Badge>
          )}
        </div>
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

const SKELETON_HEIGHTS = ["h-56", "h-72", "h-48", "h-64", "h-80", "h-52", "h-60", "h-68"];

export function ClothingGridSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-full max-w-2xl" />
      <div className={MASONRY_CLASSES}>
        {SKELETON_HEIGHTS.map((height, i) => (
          <Skeleton key={i} className={`mb-4 ${height} break-inside-avoid rounded-2xl`} />
        ))}
      </div>
    </div>
  );
}
