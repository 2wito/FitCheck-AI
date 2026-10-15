"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Palette, Pin, PinOff, Shuffle } from "lucide-react";
import { toast } from "sonner";

import { saveOutfit } from "@/actions/outfits";
import { MatchBadge } from "@/components/outfits/match-score";
import { SaveOutfitDialog, type OutfitDetails } from "@/components/outfits/save-outfit-dialog";
import { Button } from "@/components/ui/button";
import { Category } from "@/generated/prisma/browser";
import { estimateMatch } from "@/lib/match-score";
import { autoLayout } from "@/lib/outfit-layout";
import { cn } from "@/lib/utils";
import type { ClothingItem } from "@/types";

type Slot = {
  key: string;
  label: string;
  category: Category;
  // Optional slots start empty and include a "None" option.
  optional: boolean;
  imageHeight: string;
};

const SLOTS: Slot[] = [
  {
    key: "outerwear",
    label: "Outerwear",
    category: Category.OUTERWEAR,
    optional: true,
    imageHeight: "h-36 sm:h-40",
  },
  {
    key: "top",
    label: "Top",
    category: Category.TOPS,
    optional: false,
    imageHeight: "h-40 sm:h-44",
  },
  {
    key: "bottom",
    label: "Bottom",
    category: Category.BOTTOMS,
    optional: false,
    imageHeight: "h-44 sm:h-52",
  },
  {
    key: "shoes",
    label: "Shoes",
    category: Category.SHOES,
    optional: false,
    imageHeight: "h-24 sm:h-28",
  },
  {
    key: "accessory",
    label: "Accessory",
    category: Category.ACCESSORIES,
    optional: true,
    imageHeight: "h-20 sm:h-24",
  },
];

// Vertical stack of per-category carousels: lock the piece you love, then swipe (or tap the
// arrows / Shuffle) through the rest. The match score updates live with every change.
export function MixAndMatch({ closetItems }: { closetItems: ClothingItem[] }) {
  const router = useRouter();
  // Each slot's options; optional slots begin with null ("None").
  const options = Object.fromEntries(
    SLOTS.map((slot) => {
      const items = closetItems.filter((item) => item.category === slot.category);
      return [slot.key, slot.optional ? [null, ...items] : items];
    }),
  ) as Record<string, (ClothingItem | null)[]>;

  const [indexes, setIndexes] = useState<Record<string, number>>(() =>
    Object.fromEntries(SLOTS.map((slot) => [slot.key, 0])),
  );
  const [locked, setLocked] = useState<Record<string, boolean>>({});

  const selected = SLOTS.flatMap((slot) => options[slot.key][indexes[slot.key]] ?? []);
  const match = selected.length >= 2 ? estimateMatch(selected) : null;

  function setIndex(key: string, index: number) {
    setIndexes((current) => (current[key] === index ? current : { ...current, [key]: index }));
  }

  function shuffle() {
    setIndexes((current) =>
      Object.fromEntries(
        SLOTS.map((slot) => {
          const count = options[slot.key].length;
          if (locked[slot.key] || count <= 1) return [slot.key, current[slot.key]];
          // Always land on a different option than the current one.
          const next = (current[slot.key] + 1 + Math.floor(Math.random() * (count - 1))) % count;
          return [slot.key, next];
        }),
      ),
    );
  }

  async function handleSave(details: OutfitDetails) {
    const result = await saveOutfit({
      ...details,
      items: autoLayout(selected.map((item) => ({ id: item.id, category: item.category }))),
      backdrop: null,
      match: match && { score: match.score, summary: match.summary },
    }).catch(() => null);
    if (!result?.success) {
      toast.error(result?.error ?? "Couldn't save the outfit. Please try again.");
      return false;
    }
    toast.success(`"${details.name}" saved`, {
      action: {
        label: "Open",
        onClick: () => router.push(`/outfits/builder?id=${result.data.id}`),
      },
    });
    return true;
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <div className="flex flex-col gap-3">
        {SLOTS.map((slot) => (
          <SlotCarousel
            key={slot.key}
            slot={slot}
            options={options[slot.key]}
            index={indexes[slot.key]}
            locked={Boolean(locked[slot.key])}
            onIndexChange={(index) => setIndex(slot.key, index)}
            onToggleLock={() =>
              setLocked((current) => ({ ...current, [slot.key]: !current[slot.key] }))
            }
          />
        ))}
      </div>

      {/* Sticky action bar: stays in thumb reach above the phone tab bar. */}
      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 flex flex-col gap-2 rounded-2xl border bg-background/95 p-3 shadow-lg backdrop-blur md:bottom-4">
        <div className="flex items-center justify-between gap-2">
          {match ? (
            <MatchBadge score={match.score} />
          ) : (
            <span className="text-sm text-muted-foreground">Pick at least two pieces</span>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Shuffle unlocked slots"
              title="Shuffle"
              onClick={shuffle}
            >
              <Shuffle />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Open in canvas"
              title="Open in canvas"
              disabled={selected.length === 0}
              nativeButton={false}
              render={<Link href={`/outfits/builder?add=${selected.map((i) => i.id).join(",")}`} />}
            >
              <Palette />
            </Button>
            <SaveOutfitDialog
              defaults={{ name: "", occasion: "casual" }}
              isExisting={false}
              disabled={selected.length === 0}
              onSave={(details) => handleSave(details)}
            />
          </div>
        </div>
        {match && <p className="line-clamp-2 text-xs text-muted-foreground">{match.summary}</p>}
      </div>
    </div>
  );
}

function SlotCarousel({
  slot,
  options,
  index,
  locked,
  onIndexChange,
  onToggleLock,
}: {
  slot: Slot;
  options: (ClothingItem | null)[];
  index: number;
  locked: boolean;
  onIndexChange: (index: number) => void;
  onToggleLock: () => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const count = options.length;
  const current = options[index] ?? null;

  // Keep the scroll position in sync when the index changes from arrows or Shuffle.
  useEffect(() => {
    const el = scroller.current;
    if (!el || el.clientWidth === 0) return;
    if (Math.round(el.scrollLeft / el.clientWidth) !== index) {
      el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
    }
  }, [index]);

  // Swiping: read the snapped position once per frame.
  function handleScroll() {
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const el = scroller.current;
      if (el && el.clientWidth > 0) onIndexChange(Math.round(el.scrollLeft / el.clientWidth));
    });
  }

  const step = (delta: number) => onIndexChange((index + delta + count) % count);

  if (count === 0) {
    return (
      <section
        aria-label={slot.label}
        className="rounded-2xl border border-dashed p-4 text-center text-sm text-muted-foreground"
      >
        No {slot.label.toLowerCase()} in your closet yet.{" "}
        <Link href="/closet" className="font-medium text-foreground underline underline-offset-4">
          Add some
        </Link>
      </section>
    );
  }

  return (
    <section
      aria-label={slot.label}
      aria-roledescription="carousel"
      className={cn(
        "rounded-2xl bg-muted/50 ring-1 ring-foreground/5 transition-shadow",
        locked && "ring-2 ring-foreground/40",
      )}
    >
      <header className="flex items-center justify-between px-3 pt-2">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          {slot.label}
          <span className="ml-1.5 font-normal tabular-nums">
            {index + 1}/{count}
          </span>
        </p>
        <Button
          variant={locked ? "secondary" : "ghost"}
          size="sm"
          aria-pressed={locked}
          onClick={onToggleLock}
          disabled={current === null}
        >
          {locked ? <Pin data-icon="inline-start" /> : <PinOff data-icon="inline-start" />}
          {locked ? "Kept" : "Keep"}
        </Button>
      </header>

      <div className="relative">
        <div
          ref={scroller}
          onScroll={handleScroll}
          className={cn(
            "flex snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            locked ? "overflow-x-hidden" : "overflow-x-auto",
          )}
        >
          {options.map((item, i) => (
            <div
              key={item?.id ?? "none"}
              className="flex w-full shrink-0 snap-center flex-col items-center gap-1 px-14 pb-3"
              aria-hidden={i !== index}
            >
              <div className={cn("relative w-full", slot.imageHeight)}>
                {item ? (
                  <Image
                    src={item.bgRemovedUrl ?? item.imageUrl}
                    alt={item.name}
                    fill
                    sizes="(min-width: 640px) 360px, 70vw"
                    className="object-contain drop-shadow-[0_6px_8px_rgba(0,0,0,0.18)]"
                  />
                ) : (
                  <span className="flex size-full items-center justify-center text-sm text-muted-foreground">
                    None
                  </span>
                )}
              </div>
              <p className="w-full truncate text-center text-xs">
                {item?.name ?? `No ${slot.label.toLowerCase()}`}
              </p>
            </div>
          ))}
        </div>

        {count > 1 && (
          <>
            <Button
              variant="outline"
              size="icon"
              className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full"
              aria-label={`Previous ${slot.label.toLowerCase()}`}
              disabled={locked}
              onClick={() => step(-1)}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full"
              aria-label={`Next ${slot.label.toLowerCase()}`}
              disabled={locked}
              onClick={() => step(1)}
            >
              <ChevronRight />
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
