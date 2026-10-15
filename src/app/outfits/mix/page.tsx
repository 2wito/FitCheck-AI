import { Suspense } from "react";
import type { Metadata } from "next";

import { MixAndMatch } from "@/components/outfits/mix-and-match";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Mix & Match",
};

export default function MixPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <header className="mx-auto w-full max-w-lg">
        <h1 className="text-2xl font-semibold tracking-tight">Mix &amp; Match</h1>
        <p className="text-muted-foreground">
          Keep the piece you love, then swipe through the rest to find what works.
        </p>
      </header>
      <Suspense fallback={<MixSkeleton />}>
        <Mix />
      </Suspense>
    </main>
  );
}

// Reads the session cookie, so it renders per request inside the Suspense boundary.
async function Mix() {
  const userId = await requireUserId();
  const closetItems = await prisma.clothingItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return <MixAndMatch closetItems={closetItems} />;
}

function MixSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-3">
      {["h-44", "h-52", "h-60", "h-36", "h-32"].map((height, i) => (
        <Skeleton key={i} className={`${height} rounded-2xl`} />
      ))}
    </div>
  );
}
