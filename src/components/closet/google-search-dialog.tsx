"use client";

import { useState, useTransition } from "react";
import { ImageOff, Loader2, Search } from "lucide-react";

import { searchClothingImages } from "@/actions/closet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ImageSearchResult } from "@/types";

const EXAMPLES = ["Nike Air Force 1 White", "Black Zara Blazer", "Levi's 501 Jeans"];

// "Search item online" panel for the upload dialog: finds product photos by name/brand.
// Picking a result hands it to the dialog, which runs the usual cutout + AI tagging.
export function OnlineImageSearch({
  onSelect,
}: {
  onSelect: (result: ImageSearchResult) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ImageSearchResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Hotlinked thumbnails can fail to load; hide those instead of showing broken images.
  const [broken, setBroken] = useState<Set<string>>(new Set());
  const [isSearching, startSearch] = useTransition();

  function search(text: string) {
    const trimmed = text.trim();
    if (trimmed.length < 2) return;
    startSearch(async () => {
      const result = await searchClothingImages(trimmed).catch(() => null);
      if (!result?.success) {
        setError(result?.error ?? "Search failed. Please try again.");
        return;
      }
      setError(null);
      setBroken(new Set());
      setResults(result.data);
    });
  }

  const visible = results?.filter((r) => !broken.has(r.thumbnailUrl)) ?? [];

  return (
    <div className="flex flex-col gap-3">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          search(query);
        }}
        className="flex gap-2"
      >
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or brand, e.g. Nike Air Force 1 White"
          aria-label="Search for an item online"
          maxLength={100}
          autoFocus
        />
        <Button type="submit" disabled={isSearching || query.trim().length < 2}>
          {isSearching ? <Loader2 className="animate-spin" /> : <Search />}
          <span className="max-sm:sr-only">Search</span>
        </Button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {isSearching ? (
        <ResultsGrid>
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </ResultsGrid>
      ) : results === null ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Find a product photo online. We&apos;ll remove the background and tag it for you.
          </p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => {
                  setQuery(example);
                  search(example);
                }}
                className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
          <ImageOff className="size-5" />
          No images found. Try a different search.
        </div>
      ) : (
        <>
          <ResultsGrid>
            {visible.map((result) => (
              <button
                key={result.imageUrl}
                type="button"
                onClick={() => onSelect(result)}
                title={[result.title, result.source].filter(Boolean).join(" · ")}
                aria-label={`Use ${result.title || "this image"}${result.source ? ` from ${result.source}` : ""}`}
                className={cn(
                  "group relative aspect-square overflow-hidden rounded-lg bg-white ring-1 ring-foreground/10 transition",
                  "hover:ring-2 hover:ring-foreground/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                )}
              >
                {/* Third-party thumbnails from arbitrary hosts, so next/image can't be used. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={result.thumbnailUrl}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={() => setBroken((prev) => new Set(prev).add(result.thumbnailUrl))}
                  className="size-full object-contain p-1"
                />
                <span className="absolute inset-x-0 bottom-0 truncate bg-background/85 px-1.5 py-0.5 text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                  {result.source}
                </span>
              </button>
            ))}
          </ResultsGrid>
          <p className="text-xs text-muted-foreground">
            Images come from the web via Google Images. Only add photos of items you own.
          </p>
        </>
      )}
    </div>
  );
}

function ResultsGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid max-h-80 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
      {children}
    </div>
  );
}
