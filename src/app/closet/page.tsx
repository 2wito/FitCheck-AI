import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Globe, Lock, Pencil } from "lucide-react";

import { ClothingGridSkeleton } from "@/components/closet/clothing-grid";
import { ClosetView } from "@/components/closet/closet-view";
import { QuickCapture } from "@/components/closet/quick-capture";
import { TodaysLook } from "@/components/closet/todays-look";
import { UploadDialog } from "@/components/closet/upload-dialog";
import { ClosetAvatar, genderKey } from "@/components/shared/closet-avatar";
import { getActiveClosetKey, getSessionProfile, requireUserId } from "@/lib/auth";
import { DEMO_CLOSETS } from "@/lib/auth-mode";
import { dbDateToKey } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Closet",
};

export default function ClosetPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        {/* Which closet is open comes from a cookie, so this streams in per request. */}
        <Suspense fallback={<h1 className="text-3xl font-bold tracking-tight">Closet</h1>}>
          <ClosetTitle />
        </Suspense>
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

async function ClosetTitle() {
  const key = await getActiveClosetKey();
  if (key) {
    const { name, owner, avatarUrl, gender } = DEMO_CLOSETS[key];
    return (
      <TitleBlock name={name} avatar={{ src: avatarUrl, name: owner, gender }}>
        <Pencil className="size-3.5" aria-hidden />
        Example closet: everyone can add, edit and delete
      </TitleBlock>
    );
  }

  const profile = await getSessionProfile();
  if (!profile?.closetName) {
    return (
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">My Closet</h1>
        <Link href="/create" className="text-sm font-medium text-primary underline underline-offset-4">
          Give your closet a name
        </Link>
      </div>
    );
  }
  const isPublic = profile.visibility === "PUBLIC";
  return (
    <TitleBlock
      name={profile.closetName}
      avatar={{
        src: profile.avatarUrl,
        name: profile.name ?? profile.closetName,
        gender: genderKey(profile.gender),
      }}
    >
      {isPublic ? (
        <>
          <Globe className="size-3.5" aria-hidden />
          Public
          {profile.slug && (
            <Link href={`/c/${profile.slug}`} className="underline underline-offset-4 hover:text-foreground">
              See what visitors see
            </Link>
          )}
        </>
      ) : (
        <>
          <Lock className="size-3.5" aria-hidden />
          Private: only you can see it
        </>
      )}
    </TitleBlock>
  );
}

function TitleBlock({
  name,
  avatar,
  children,
}: {
  name: string;
  avatar: { src: string | null; name: string; gender: "male" | "female" | null };
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-4">
      <ClosetAvatar {...avatar} className="size-14 text-lg sm:size-16" />
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight break-words sm:text-3xl">
          <bdi>{name}</bdi>
        </h1>
        <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
          {children}
        </p>
      </div>
    </div>
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
