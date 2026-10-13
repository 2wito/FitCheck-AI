import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Shirt } from "lucide-react";

import { OutfitCard } from "@/components/outfits/outfit-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "My Outfits",
};

const GRID_CLASSES = "grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4";

export default function OutfitsPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Outfits</h1>
          <p className="text-muted-foreground">Looks you&apos;ve put together, ready to wear.</p>
        </div>
        <Button nativeButton={false} render={<Link href="/outfits/builder" />}>
          <Plus data-icon="inline-start" />
          Create outfit
        </Button>
      </header>

      <Suspense fallback={<OutfitsSkeleton />}>
        <OutfitList />
      </Suspense>
    </main>
  );
}

// Reads the session cookie, so it renders per request inside the Suspense boundary.
async function OutfitList() {
  const userId = await requireUserId();

  const outfits = await prisma.outfit.findMany({
    where: { userId },
    include: { items: { include: { clothingItem: true } } },
    orderBy: { updatedAt: "desc" },
  });

  if (outfits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Shirt className="size-6 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">No outfits yet</p>
          <p className="text-sm text-muted-foreground">
            Build one on the canvas, or let the AI stylist put one together for you.
          </p>
        </div>
        <Button variant="outline" nativeButton={false} render={<Link href="/outfits/builder" />}>
          Create your first outfit
        </Button>
      </div>
    );
  }

  return (
    <ul className={GRID_CLASSES}>
      {outfits.map((outfit) => (
        <li key={outfit.id}>
          <OutfitCard outfit={outfit} />
        </li>
      ))}
    </ul>
  );
}

function OutfitsSkeleton() {
  return (
    <div className={GRID_CLASSES}>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="aspect-[3/4] rounded-xl" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-7 w-full" />
        </div>
      ))}
    </div>
  );
}
