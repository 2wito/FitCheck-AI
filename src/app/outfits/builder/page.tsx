import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { OutfitCanvas, type InitialOutfit } from "@/components/outfits/outfit-canvas";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUserId } from "@/lib/auth";
import { BACKDROP_IDS, type BackdropId } from "@/lib/backdrops";
import { OCCASIONS, type Occasion } from "@/lib/clothing";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Outfit Builder",
};

export default function BuilderPage({ searchParams }: PageProps<"/outfits/builder">) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6">
      <Suspense fallback={<BuilderSkeleton />}>
        <Builder searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

// `?id=<outfitId>` opens a saved outfit for editing; no id starts a new one.
// `?add=<itemId>` (closet "Send to canvas") places that item on the canvas.
async function Builder({ searchParams }: Pick<PageProps<"/outfits/builder">, "searchParams">) {
  const { id, add } = await searchParams;
  const outfitId = typeof id === "string" ? id : null;
  const addId = typeof add === "string" && z.uuid().safeParse(add).success ? add : null;
  if (outfitId && !z.uuid().safeParse(outfitId).success) notFound();

  const userId = await requireUserId();

  const [closetItems, outfit] = await Promise.all([
    prisma.clothingItem.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    outfitId
      ? prisma.outfit.findFirst({ where: { id: outfitId, userId }, include: { items: true } })
      : null,
  ]);
  if (outfitId && !outfit) notFound();

  const initialOutfit: InitialOutfit | null = outfit && {
    id: outfit.id,
    name: outfit.name,
    occasion: OCCASIONS.includes(outfit.occasion as Occasion)
      ? (outfit.occasion as Occasion)
      : "casual",
    items: outfit.items.map(({ clothingItemId, positionX, positionY, scale, zIndex }) => ({
      clothingItemId,
      positionX,
      positionY,
      scale,
      zIndex,
    })),
    backdrop: BACKDROP_IDS.includes(outfit.backdrop as BackdropId) ? (outfit.backdrop as BackdropId) : null,
    match:
      outfit.matchScore !== null
        ? { score: outfit.matchScore, summary: outfit.matchSummary ?? "" }
        : null,
  };

  return (
    <OutfitCanvas
      key={`${outfit?.id ?? "new"}:${addId ?? ""}`}
      closetItems={closetItems}
      initialOutfit={initialOutfit}
      initialAddId={addId}
    />
  );
}

function BuilderSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-12 w-64" />
      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <Skeleton className="order-2 h-96 rounded-xl lg:order-1" />
        <Skeleton className="order-1 mx-auto aspect-[3/4] w-full max-w-md rounded-2xl lg:order-2" />
      </div>
    </div>
  );
}
