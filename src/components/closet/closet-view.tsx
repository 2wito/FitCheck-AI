"use client";

import { useMemo, useState } from "react";
import { DoorOpen, LayoutGrid, ListChecks, Plus, Trash2 } from "lucide-react";

import { EmptyState, MasonryGrid } from "@/components/closet/clothing-grid";
import { EditPhotoContext } from "@/components/closet/item-actions";
import { DeleteItemDialog, EditItemDialog } from "@/components/closet/item-dialogs";
import { PhotoFrameEditor } from "@/components/closet/photo-frame-editor";
import {
  DeleteSectionDialog,
  NewSectionDialog,
  SectionItemsDialog,
} from "@/components/closet/section-dialogs";
import { WardrobeView } from "@/components/closet/wardrobe-view";
import { Button } from "@/components/ui/button";
import { ItemType } from "@/generated/prisma/browser";
import { ITEM_TYPE_LABELS } from "@/lib/clothing";
import { cn } from "@/lib/utils";
import type { ClosetItem, ClosetSection } from "@/types";

type ViewMode = "masonry" | "wardrobe";

const VIEW_MODES: { value: ViewMode; label: string; icon: typeof LayoutGrid }[] = [
  { value: "masonry", label: "Grid", icon: LayoutGrid },
  { value: "wardrobe", label: "Wardrobe", icon: DoorOpen },
];

// Filter ids: "all", "type:SHIRT" or "section:<id>". All client-side, so switching is instant.
type Filter = { id: string; label: string; matches: (item: ClosetItem) => boolean };

const ALL_FILTER: Filter = { id: "all", label: "All", matches: () => true };

const TYPE_FILTERS: Filter[] = Object.values(ItemType).map((type) => ({
  id: `type:${type}`,
  label: ITEM_TYPE_LABELS[type],
  matches: (item) => item.type === type,
}));

export function ClosetView({
  items,
  sections,
}: {
  items: ClosetItem[];
  sections: ClosetSection[];
}) {
  const [view, setView] = useState<ViewMode>("masonry");
  const [filterId, setFilterId] = useState("all");
  const [editing, setEditing] = useState<ClosetItem | null>(null);
  const [framing, setFraming] = useState<ClosetItem | null>(null);
  const [deleting, setDeleting] = useState<ClosetItem | null>(null);
  const [creatingSection, setCreatingSection] = useState(false);
  const [pickingFor, setPickingFor] = useState<ClosetSection | null>(null);
  const [deletingSection, setDeletingSection] = useState<ClosetSection | null>(null);

  const sectionFilters = useMemo<Filter[]>(
    () =>
      sections.map((section) => ({
        id: `section:${section.id}`,
        label: section.name,
        matches: (item) => item.sectionIds.includes(section.id),
      })),
    [sections],
  );

  const counts = useMemo(
    () =>
      new Map(
        [ALL_FILTER, ...TYPE_FILTERS, ...sectionFilters].map((f) => [
          f.id,
          items.filter(f.matches).length,
        ]),
      ),
    [items, sectionFilters],
  );

  if (items.length === 0) {
    return (
      <EmptyState
        title="Your closet is empty"
        description='Add your first item with the "Add item" button to start building outfits.'
      />
    );
  }

  // Accessories only get a pill when there are some, keeping the row to the main types.
  const typeFilters = TYPE_FILTERS.filter(
    (f) => f.id !== `type:${ItemType.ACCESSORY}` || (counts.get(f.id) ?? 0) > 0,
  );
  const filter =
    [ALL_FILTER, ...TYPE_FILTERS, ...sectionFilters].find((f) => f.id === filterId) ??
    ALL_FILTER;
  const visible = items.filter(filter.matches);
  const activeSection = sections.find((s) => `section:${s.id}` === filter.id) ?? null;

  const pill = (f: Filter) => (
    <button
      key={f.id}
      type="button"
      onClick={() => setFilterId(f.id)}
      aria-pressed={filter.id === f.id}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors pointer-coarse:min-h-12 pointer-coarse:px-4",
        filter.id === f.id
          ? "border-foreground bg-foreground text-background"
          : "bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground",
      )}
    >
      {f.label}
      <span className="text-xs tabular-nums opacity-60">{counts.get(f.id)}</span>
    </button>
  );

  return (
    <EditPhotoContext.Provider value={setFraming}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              role="group"
              aria-label="Filter by type"
              className="-mx-4 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-4 pb-1 max-sm:basis-full sm:mx-0 sm:px-0"
            >
              {pill(ALL_FILTER)}
              {typeFilters.map(pill)}
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

          {/* The user's own sections, plus the button to make a new one. */}
          <div
            role="group"
            aria-label="My sections"
            className="-mx-4 flex min-w-0 gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
          >
            {sectionFilters.map(pill)}
            <button
              type="button"
              onClick={() => setCreatingSection(true)}
              className="flex shrink-0 items-center gap-1 rounded-full border border-dashed px-3 py-1 text-sm text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground pointer-coarse:min-h-12 pointer-coarse:px-4"
            >
              <Plus className="size-3.5" />
              New section
            </button>
          </div>
        </div>

        {activeSection && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPickingFor(activeSection)}>
              <ListChecks data-icon="inline-start" />
              Choose items
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => setDeletingSection(activeSection)}
            >
              <Trash2 data-icon="inline-start" />
              Delete section
            </Button>
          </div>
        )}

        {visible.length === 0 ? (
          activeSection ? (
            <EmptyState
              title={`"${activeSection.name}" is empty`}
              description='Use "Choose items" to put clothes in this section.'
            />
          ) : (
            <EmptyState
              title={`No ${filter.label.toLowerCase()} yet`}
              description="Add one, or change an existing item's type with Edit tags."
            />
          )
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

        {/* Keyed so each dialog's state resets per item / section. */}
        <EditItemDialog
          key={editing?.id ?? "none"}
          item={editing}
          onClose={() => setEditing(null)}
        />
        <DeleteItemDialog item={deleting} onClose={() => setDeleting(null)} />
        <PhotoFrameEditor
          key={`frame-${framing?.id ?? "none"}`}
          item={framing}
          onClose={() => setFraming(null)}
        />
        <NewSectionDialog
          open={creatingSection}
          onClose={() => setCreatingSection(false)}
          onCreated={(section) => {
            // Straight into picking items for the new section.
            setCreatingSection(false);
            setFilterId(`section:${section.id}`);
            setPickingFor(section);
          }}
        />
        <SectionItemsDialog
          key={`pick-${pickingFor?.id ?? "none"}`}
          section={pickingFor}
          items={items}
          onClose={() => setPickingFor(null)}
        />
        <DeleteSectionDialog
          section={deletingSection}
          onClose={() => setDeletingSection(null)}
          onDeleted={() => {
            setDeletingSection(null);
            setFilterId("all");
          }}
        />
      </div>
    </EditPhotoContext.Provider>
  );
}
