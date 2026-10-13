import { Suspense } from "react";
import type { Metadata } from "next";

import { ClothingGrid, ClothingGridSkeleton } from "@/components/closet/clothing-grid";
import { UploadDialog } from "@/components/closet/upload-dialog";
import { requireUserId } from "@/lib/auth";
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
        <ClosetItems />
      </Suspense>
    </main>
  );
}

// Reads the session cookie, so it renders per request inside the Suspense boundary.
async function ClosetItems() {
  const userId = await requireUserId();

  const items = await prisma.clothingItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return <ClothingGrid items={items} />;
}
