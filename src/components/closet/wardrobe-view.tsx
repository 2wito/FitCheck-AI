"use client";

import Image from "next/image";

import { ItemQuickActions } from "@/components/closet/item-actions";
import { Category } from "@/generated/prisma/browser";
import { cn } from "@/lib/utils";
import type { ClosetItem } from "@/types";

type SectionKind = "rail" | "shelf";

const SECTIONS: { title: string; kind: SectionKind; categories: Category[]; compact?: boolean }[] =
  [
    { title: "Hanging rail", kind: "rail", categories: [Category.OUTERWEAR, Category.TOPS] },
    { title: "Folded shelf", kind: "shelf", categories: [Category.BOTTOMS] },
    { title: "Shoe rack", kind: "shelf", categories: [Category.SHOES], compact: true },
    { title: "Accessories", kind: "shelf", categories: [Category.ACCESSORIES], compact: true },
  ];

// "Visual wardrobe" mode: cutouts hang on a rail or sit on wooden shelves, all in CSS/SVG.
export function WardrobeView({
  items,
  filtered,
  onEdit,
  onDelete,
}: {
  items: ClosetItem[];
  // When a filter is active, empty sections are hidden instead of shown as empty shelves.
  filtered: boolean;
  onEdit: (item: ClosetItem) => void;
  onDelete: (item: ClosetItem) => void;
}) {
  const sections = SECTIONS.map((section) => ({
    ...section,
    items: items.filter((item) => section.categories.includes(item.category)),
  })).filter((section) => !filtered || section.items.length > 0);

  return (
    <div className="rounded-3xl border-[10px] border-wood bg-closet shadow-[inset_0_2px_24px_rgba(0,0,0,0.12)]">
      <div className="flex flex-col divide-y divide-wood-dark/15">
        {sections.map((section) => (
          <section key={section.title} aria-label={section.title} className="py-4">
            <h3 className="px-5 text-[11px] font-semibold tracking-widest text-wood-dark uppercase">
              {section.title}
              <span className="ml-1.5 font-normal tabular-nums opacity-70">
                {section.items.length}
              </span>
            </h3>
            {section.kind === "rail" ? (
              <HangingRail items={section.items} onEdit={onEdit} onDelete={onDelete} />
            ) : (
              <Shelf
                items={section.items}
                compact={section.compact}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

type RowProps = {
  items: ClosetItem[];
  onEdit: (item: ClosetItem) => void;
  onDelete: (item: ClosetItem) => void;
};

function HangingRail({ items, onEdit, onDelete }: RowProps) {
  return (
    // One scroll container, so the rod stretches under every hanger while scrolling.
    <div className="overflow-x-auto">
      <div className="relative w-max min-w-full">
        {/* The rod; hanger hooks overlap it. */}
        <div className="absolute inset-x-3 top-[18px] h-2 rounded-full bg-closet-rod shadow-[0_2px_3px_rgba(0,0,0,0.25),inset_0_1px_1px_rgba(255,255,255,0.5)]" />
        <ul className="relative flex min-h-48 gap-2 px-6 pt-2 pb-2">
          {items.length === 0 && <EmptyRow />}
          {items.map((item) => (
            <li
              key={item.id}
              className="group relative flex w-28 shrink-0 flex-col items-center sm:w-32"
            >
              <Hanger className="h-9 w-20 text-wood-dark" />
              <div className="relative -mt-1 h-40 w-full sm:h-44">
                <Image
                  src={item.bgRemovedUrl ?? item.imageUrl}
                  alt={item.name}
                  fill
                  sizes="128px"
                  className="object-contain object-top drop-shadow-[0_8px_10px_rgba(0,0,0,0.25)] transition-transform duration-300 group-hover:rotate-1"
                />
              </div>
              <ItemLabel name={item.name} />
              <ItemQuickActions
                item={item}
                onEdit={onEdit}
                onDelete={onDelete}
                className="absolute top-10 right-0 flex-col"
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Shelf({ items, compact, onEdit, onDelete }: RowProps & { compact?: boolean }) {
  return (
    // Items, plank and labels scroll together inside one container.
    <div className="overflow-x-auto px-3">
      <div className="w-max min-w-full">
        <ul className={cn("flex items-end gap-3 px-3 pt-3", compact ? "min-h-28" : "min-h-36")}>
          {items.length === 0 && <EmptyRow />}
          {items.map((item) => (
            <li
              key={item.id}
              className={cn(
                "group relative flex shrink-0 flex-col items-center",
                compact ? "w-24" : "w-28 sm:w-32",
              )}
            >
              <div className={cn("relative w-full", compact ? "h-20" : "h-28")}>
                <Image
                  src={item.bgRemovedUrl ?? item.imageUrl}
                  alt={item.name}
                  fill
                  sizes="128px"
                  className="object-contain object-bottom drop-shadow-[0_6px_6px_rgba(0,0,0,0.25)] transition-transform duration-300 group-hover:-translate-y-1"
                />
              </div>
              <ItemQuickActions
                item={item}
                onEdit={onEdit}
                onDelete={onDelete}
                className="absolute -top-1 right-0 flex-col"
              />
            </li>
          ))}
        </ul>
        {/* The wooden plank the items rest on. */}
        <div className="h-3 rounded-sm bg-gradient-to-b from-wood to-wood-dark shadow-[0_8px_10px_-6px_rgba(0,0,0,0.45)]" />
        <ul className="flex gap-3 px-3 pt-1" aria-hidden>
          {items.map((item) => (
            <li key={item.id} className={cn("shrink-0", compact ? "w-24" : "w-28 sm:w-32")}>
              <ItemLabel name={item.name} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ItemLabel({ name }: { name: string }) {
  return (
    <p className="mt-1 w-full truncate text-center text-[11px] text-muted-foreground" title={name}>
      {name}
    </p>
  );
}

function EmptyRow() {
  return (
    <li className="self-center py-6 text-xs text-muted-foreground italic">Nothing here yet</li>
  );
}

function Hanger({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 36"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {/* Hook over the rod, then the shoulders and bar. */}
      <path d="M40 16V12a5 5 0 1 0-5-5" />
      <path d="M40 16 6 32h68Z" />
    </svg>
  );
}
