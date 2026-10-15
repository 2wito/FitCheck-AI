"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { ArrowLeftRight, ExternalLink, Loader2, Plus, ShoppingBag, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { findItemsToBuy, type ShoppingSuggestions } from "@/actions/shopping";
import { Button } from "@/components/ui/button";
import type { Category } from "@/generated/prisma/browser";
import { CATEGORY_LABELS } from "@/lib/clothing";
import type { LookCompletion } from "@/lib/complete-look";
import type { ClothingItem } from "@/types";

// Shown under the canvas when the outfit is missing a core piece or scores below 70%.
export function CompleteTheLook({
  completion,
  outfit,
  onAdd,
  onSwap,
}: {
  completion: LookCompletion;
  outfit: ClothingItem[];
  onAdd: (id: string) => void;
  onSwap: (oldId: string, newId: string) => void;
}) {
  const { additions, swaps, notInCloset } = completion;
  if (additions.length === 0 && swaps.length === 0 && notInCloset.length === 0) return null;

  return (
    <section
      aria-labelledby="complete-look-heading"
      className="flex w-full max-w-xl flex-col gap-3 rounded-xl border bg-card p-3 text-sm"
    >
      <h3 id="complete-look-heading" className="flex items-center gap-1.5 font-medium">
        <Wand2 className="size-4" />
        Complete the look
      </h3>

      {(additions.length > 0 || swaps.length > 0) && (
        <ul className="flex flex-col gap-2">
          {additions.map(({ item }) => (
            <SuggestionRow
              key={`add-${item.id}`}
              item={item}
              text={`Add ${CATEGORY_LABELS[item.category].toLowerCase()}: ${item.name}`}
              action={
                <Button size="sm" variant="outline" onClick={() => onAdd(item.id)}>
                  <Plus data-icon="inline-start" />
                  Add
                </Button>
              }
            />
          ))}
          {swaps.map(({ item, replaces, gain }) => (
            <SuggestionRow
              key={`swap-${item.id}`}
              item={item}
              text={`Swap ${replaces.name} for ${item.name}`}
              hint={`+${gain} match`}
              action={
                <Button size="sm" variant="outline" onClick={() => onSwap(replaces.id, item.id)}>
                  <ArrowLeftRight data-icon="inline-start" />
                  Swap
                </Button>
              }
            />
          ))}
        </ul>
      )}

      {notInCloset.map((category) => (
        <ShoppingSuggestion key={category} category={category} outfit={outfit} />
      ))}
    </section>
  );
}

function SuggestionRow({
  item,
  text,
  hint,
  action,
}: {
  item: ClothingItem;
  text: string;
  hint?: string;
  action: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3">
      <div className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-muted">
        <Image
          src={item.bgRemovedUrl ?? item.imageUrl}
          alt=""
          fill
          sizes="44px"
          className="object-contain p-1"
        />
      </div>
      <p className="min-w-0 flex-1 truncate">
        {text}
        {hint && (
          <span className="ml-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            {hint}
          </span>
        )}
      </p>
      {action}
    </li>
  );
}

// "You don't own any shoes yet": fetches 2-3 items to buy on demand (saves search quota).
function ShoppingSuggestion({ category, outfit }: { category: Category; outfit: ClothingItem[] }) {
  const [suggestions, setSuggestions] = useState<ShoppingSuggestions | null>(null);
  const [isLoading, startLoading] = useTransition();
  const label = CATEGORY_LABELS[category].toLowerCase();

  function load() {
    startLoading(async () => {
      const styles = outfit.map((i) => i.style).filter((s): s is string => !!s);
      const result = await findItemsToBuy({
        category,
        colors: outfit.map((i) => i.color).filter((c): c is string => !!c),
        style: styles[0] ?? null,
      }).catch(() => null);
      if (!result?.success) {
        toast.error(result?.error ?? "Couldn't load suggestions. Please try again.");
        return;
      }
      setSuggestions(result.data);
    });
  }

  return (
    <div className="flex flex-col gap-2 border-t pt-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground">You don&apos;t have any {label} in your closet yet.</p>
        {!suggestions && (
          <Button size="sm" variant="outline" onClick={load} disabled={isLoading}>
            {isLoading ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <ShoppingBag data-icon="inline-start" />
            )}
            Find {label} to buy
          </Button>
        )}
      </div>

      {suggestions && (
        <>
          {suggestions.results.length === 0 ? (
            <p className="text-muted-foreground">No suggestions found.</p>
          ) : (
            <ul className="grid grid-cols-3 gap-2">
              {suggestions.results.map((result) => (
                <li key={result.imageUrl}>
                  <a
                    href={result.link ?? result.imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col gap-1"
                  >
                    <div className="aspect-square overflow-hidden rounded-lg bg-white ring-1 ring-foreground/10">
                      {/* Third-party thumbnails from arbitrary hosts, so next/image can't be used. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={result.thumbnailUrl}
                        alt=""
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="size-full object-contain p-1 transition-transform group-hover:scale-105"
                      />
                    </div>
                    <span className="line-clamp-2 text-xs">{result.title || result.source}</span>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      {result.source}
                      <ExternalLink className="size-3" />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
          <a
            href={suggestions.searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 self-start text-xs font-medium underline-offset-4 hover:underline"
          >
            More on Google Shopping
            <ExternalLink className="size-3" />
          </a>
        </>
      )}
    </div>
  );
}
