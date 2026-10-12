"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";

import { Category } from "@/generated/prisma/browser";
import { CATEGORY_LABELS } from "@/lib/clothing";
import { cn } from "@/lib/utils";
import type { ClothingItem } from "@/types";

// Data type used when dragging an item from the drawer onto the canvas.
export const DRAG_MIME = "application/x-fitcheck-item";

type Filter = "ALL" | Category;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "ALL", label: "All" },
  ...Object.values(Category).map((value) => ({ value, label: CATEGORY_LABELS[value] })),
];

export function ClosetDrawer({
  items,
  onCanvas,
  onToggle,
}: {
  items: ClothingItem[];
  onCanvas: Set<string>;
  onToggle: (id: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const visible = filter === "ALL" ? items : items.filter((item) => item.category === filter);

  return (
    <aside className="flex min-h-0 flex-col gap-3 rounded-xl border bg-card p-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-medium">Your closet</h2>
        <p className="text-xs text-muted-foreground">Click or drag onto the canvas</p>
      </div>

      <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by category">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
              filter === value
                ? "border-foreground bg-foreground text-background"
                : "text-muted-foreground hover:border-foreground/40 hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Your closet is empty.{" "}
          <Link href="/closet" className="font-medium text-foreground underline underline-offset-4">
            Add some items
          </Link>{" "}
          to start styling.
        </p>
      ) : visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No {CATEGORY_LABELS[filter as Category].toLowerCase()} in your closet yet.
        </p>
      ) : (
        <ul className="grid min-h-0 grid-cols-3 gap-2 overflow-y-auto pr-1 lg:max-h-[calc(100dvh-16rem)]">
          {visible.map((item) => {
            const selected = onCanvas.has(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(DRAG_MIME, item.id);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => onToggle(item.id)}
                  aria-pressed={selected}
                  aria-label={`${selected ? "Remove" : "Add"} ${item.name}`}
                  title={item.name}
                  className={cn(
                    "relative block aspect-square w-full cursor-grab overflow-hidden rounded-lg bg-muted/60 ring-1 ring-foreground/5 transition active:cursor-grabbing",
                    "hover:ring-foreground/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    selected && "ring-2 ring-foreground",
                  )}
                >
                  <Image
                    src={item.bgRemovedUrl ?? item.imageUrl}
                    alt=""
                    fill
                    sizes="100px"
                    draggable={false}
                    className="object-contain p-1.5"
                  />
                  {selected && (
                    <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-foreground text-background">
                      <Check className="size-3" />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
