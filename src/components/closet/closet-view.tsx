"use client";

import { useMemo, useState } from "react";
import { DoorOpen, LayoutGrid } from "lucide-react";

import { EmptyState, MasonryGrid } from "@/components/closet/clothing-grid";
import { DeleteItemDialog, EditItemDialog } from "@/components/closet/item-dialogs";
import { WardrobeView } from "@/components/closet/wardrobe-view";
import { QUICK_FILTERS } from "@/lib/closet-filters";
import { cn } from "@/lib/utils";
import type { ClosetItem } from "@/types";

type ViewMode = "masonry" | "wardrobe";

const VIEW_MODES: { value: ViewMode; label: string; icon: typeof LayoutGrid }[] = [
  { value: "masonry", label: "Grid", icon: LayoutGrid },
  { value: "wardrobe", label: "Wardrobe", icon: DoorOpen },
];

export function ClosetView({ items }: { items: ClosetItem[] }) {
  const [view, setView] = useState<ViewMode>("masonry");
  const [filterId, setFilterId] = useState("all");
  const [editing, setEditing] = useState<ClosetItem | null>(null);
  const [deleting, setDeleting] = useState<ClosetItem | null>(null);

  const counts = useMemo(
    () => new Map(QUICK_FILTERS.map((f) => [f.id, items.filter(f.matches).length])),
    [items],
  );

  if (items.length === 0) {
    return (
      <EmptyState
        title="Your closet is empty"
        description='Add your first item with the "Add item" button to start building outfits.'
      />
    );
  }

  const filter = QUICK_FILTERS.find((f) => f.id === filterId) ?? QUICK_FILTERS[0];
  const visible = items.filter(filter.matches);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Quick filters: client-side only, so switching is instant. */}
        <div
          role="group"
          aria-label="Filter closet"
          className="-mx-4 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
        >
          {QUICK_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterId(f.id)}
              aria-pressed={filterId === f.id}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
                filterId === f.id
                  ? "border-foreground bg-foreground text-background"
                  : "bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground",
              )}
            >
              {f.label}
              <span className="text-xs tabular-nums opacity-60">{counts.get(f.id)}</span>
            </button>
          ))}
        </div>

        <div
          role="radiogroup"
          aria-label="View mode"
          className="flex shrink-0 rounded-lg bg-muted p-0.5"
        >
          {VIEW_MODES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={view === value}
              onClick={() => setView(value)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm transition-colors",
                view === value
                  ? "bg-background font-medium text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={`No ${filter.label.toLowerCase()} items yet`}
          description="Try another filter, or add items that match this one."
        />
      ) : view === "masonry" ? (
        <MasonryGrid items={visible} onEdit={setEditing} onDelete={setDeleting} />
      ) : (
        <WardrobeView
          items={visible}
          filtered={filter.id !== "all"}
          onEdit={setEditing}
          onDelete={setDeleting}
        />
      )}

      {/* Keyed so the form resets for each item. */}
      <EditItemDialog key={editing?.id ?? "none"} item={editing} onClose={() => setEditing(null)} />
      <DeleteItemDialog item={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}
