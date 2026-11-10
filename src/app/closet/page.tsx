import { Suspense } from "react";
import type { Metadata } from "next";

import { ClothingGridSkeleton } from "@/components/closet/clothing-grid";
import { ClosetView } from "@/components/closet/closet-view";
import { QuickCapture } from "@/components/closet/quick-capture";
import { TodaysLook } from "@/components/closet/todays-look";
import { UploadDialog } from "@/components/closet/upload-dialog";
import { requireUserId } from "@/lib/auth";
import { AUTH_ENABLED, DEV_USER } from "@/lib/auth-mode";
import { dbDateToKey } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: AUTH_ENABLED ? "My Closet" : DEV_USER.name,
};

export default function ClosetPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {AUTH_ENABLED ? "My Closet" : DEV_USER.name}
          </h1>
          <p className="text-muted-foreground">Everything you own, ready to mix and match.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <QuickCapture />
          <UploadDialog />
        </div>
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

  const [items, wearStats, sections] = await Promise.all([
    prisma.clothingItem.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      // Outfit count is shown when deleting an item that saved outfits use.
      include: {
        _count: { select: { outfitItems: true } },
        sections: { select: { id: true } },
      },
    }),
    prisma.outfitWear.groupBy({
      by: ["clothingItemId"],
      where: { userId },
      _count: { _all: true },
      _max: { wornAt: true },
    }),
    prisma.section.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const statsById = new Map(
    wearStats.map((s) => [
      s.clothingItemId,
      { count: s._count._all, lastWornAt: s._max.wornAt ? dbDateToKey(s._max.wornAt) : null },
    ]),
  );
  const closet = items.map(({ sections: itemSections, ...item }) => ({
    ...item,
    sectionIds: itemSections.map((s) => s.id),
    wear: statsById.get(item.id) ?? { count: 0, lastWornAt: null },
  }));

  return (
    <>
      {closet.length >= 2 && <TodaysLook closetItems={closet} />}
      <ClosetView items={closet} sections={sections} />
    </>
  );
}
