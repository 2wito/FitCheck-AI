import { Suspense } from "react";
import type { Metadata } from "next";

import { ClothingGridSkeleton } from "@/components/closet/clothing-grid";
import { ClosetView } from "@/components/closet/closet-view";
import { TodaysLook } from "@/components/closet/todays-look";
import { UploadDialog } from "@/components/closet/upload-dialog";
import { requireUserId } from "@/lib/auth";
import { dbDateToKey } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "My Closet",
};

export default function ClosetPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Closet</h1>
          <p className="text-muted-foreground">Everything you own, ready to mix and match.</p>
        </div>
        <UploadDialog />
      </header>

      <Suspense fallback={<ClothingGridSkeleton />}>
        {/* Today's look + the closet grid share one data fetch. */}
        <ClosetItems />
      </Suspense>
    </main>
  );
}

// Reads the session cookie, so it renders per request inside the Suspense boundary.
async function ClosetItems() {
  const userId = await requireUserId();

  const [items, wearStats] = await Promise.all([
    prisma.clothingItem.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      // Outfit count is shown when deleting an item that saved outfits use.
      include: { _count: { select: { outfitItems: true } } },
    }),
    prisma.outfitWear.groupBy({
      by: ["clothingItemId"],
      where: { userId },
      _count: { _all: true },
      _max: { wornAt: true },
    }),
  ]);

  const statsById = new Map(
    wearStats.map((s) => [
      s.clothingItemId,
      { count: s._count._all, lastWornAt: s._max.wornAt ? dbDateToKey(s._max.wornAt) : null },
    ]),
  );
  const closet = items.map((item) => ({
    ...item,
    wear: statsById.get(item.id) ?? { count: 0, lastWornAt: null },
  }));

  return (
    <>
      {closet.length >= 2 && <TodaysLook closetItems={closet} />}
      <ClosetView items={closet} />
    </>
  );
}
