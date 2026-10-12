"use client";

import { useState } from "react";
import Image from "next/image";
import { Shirt } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Category } from "@/generated/prisma/browser";
import { CATEGORY_LABELS, SEASON_LABELS } from "@/lib/clothing";
import type { ClothingItem } from "@/types";

type Filter = "ALL" | Category;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "ALL", label: "All" },
  ...Object.values(Category).map((category) => ({
    value: category,
    label: CATEGORY_LABELS[category],
  })),
];

const GRID_CLASSES = "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4";

export function ClothingGrid({ items }: { items: ClothingItem[] }) {
  const [filter, setFilter] = useState<Filter>("ALL");

  if (items.length === 0) {
    return (
      <EmptyState
        title="Your closet is empty"
        description='Add your first item with the "Add item" button to start building outfits.'
      />
    );
  }

  const visible = filter === "ALL" ? items : items.filter((item) => item.category === filter);
  const countFor = (value: Filter) =>
    value === "ALL" ? items.length : items.filter((item) => item.category === value).length;

  return (
    <div className="flex flex-col gap-6">
      <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <TabsList>
            {FILTERS.map(({ value, label }) => (
              <TabsTrigger key={value} value={value} className="px-3">
                {label}
                <span className="text-xs tabular-nums text-muted-foreground">
                  {countFor(value)}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      {visible.length === 0 ? (
        <EmptyState
          title={`No ${CATEGORY_LABELS[filter as Category].toLowerCase()} yet`}
          description="Items you add in this category will show up here."
        />
      ) : (
        <ul className={GRID_CLASSES}>
          {visible.map((item) => (
            <li key={item.id}>
              <ClothingCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ClothingCard({ item }: { item: ClothingItem }) {
  const colors = [item.color, item.secondaryColor].filter(Boolean).join(" / ");

  return (
    <article className="group flex flex-col gap-2">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-muted/60 ring-1 ring-foreground/5">
        <Image
          src={item.bgRemovedUrl ?? item.imageUrl}
          alt={item.name}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="object-contain p-4 transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-col gap-1 px-0.5">
        <h3 className="truncate text-sm font-medium">{item.name}</h3>
        {colors && <p className="truncate text-xs text-muted-foreground capitalize">{colors}</p>}
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

function EmptyState({ title, description }: { title: string; description: string }) {
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
      <Skeleton className="h-8 w-full max-w-lg" />
      <div className={GRID_CLASSES}>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="aspect-square rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
