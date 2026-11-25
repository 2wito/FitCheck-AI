import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Eye, Lock, MapPin, Pencil } from "lucide-react";

import { ShareClosetButton } from "@/components/closets/account-forms";
import { Details } from "@/components/closets/details";
import { ReadOnlyCloset } from "@/components/closets/read-only-closet";
import { MatchBadge } from "@/components/outfits/match-score";
import { OutfitPreview } from "@/components/outfits/outfit-preview";
import { ClosetAvatar, genderKey } from "@/components/shared/closet-avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { capitalize } from "@/lib/clothing";
import { getClosetContents, getViewableCloset } from "@/lib/closets";

export async function generateMetadata({ params }: PageProps<"/c/[slug]">): Promise<Metadata> {
  const closet = await getViewableCloset((await params).slug);
  if (!closet) return { title: "Closet not found" };
  return { title: closet.closetName, description: `${closet.closetName} on FitCheck AI` };
}

// A closet as visitors see it: look, but don't touch.
export default function PublicClosetPage({ params }: PageProps<"/c/[slug]">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <Suspense fallback={<Skeleton className="h-96 rounded-3xl" />}>
        <Closet params={params} />
      </Suspense>
    </main>
  );
}

async function Closet({ params }: Pick<PageProps<"/c/[slug]">, "params">) {
  const { slug } = await params;
  const closet = await getViewableCloset(slug);
  if (!closet) notFound();

  const { items, sections, outfits } = await getClosetContents(closet.id);
  const isPrivate = closet.visibility === "PRIVATE";

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <ClosetAvatar
            src={closet.avatarUrl}
            name={closet.name ?? closet.closetName}
            gender={genderKey(closet.gender)}
            className="size-16 text-xl sm:size-20"
          />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight break-words sm:text-3xl">
              <bdi>{closet.closetName}</bdi>
            </h1>
            <p className="flex flex-wrap items-center gap-x-3 text-muted-foreground">
              <bdi className="font-medium text-foreground">{closet.name}</bdi>
              {(closet.age || closet.city) && (
                <span className="flex items-center gap-1 text-sm">
                  {closet.city && <MapPin className="size-3.5" aria-hidden />}
                  <span>
                    <Details parts={[closet.age, closet.city]} />
                  </span>
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm text-muted-foreground">
            {isPrivate ? <Lock className="size-4" /> : <Eye className="size-4" />}
            {isPrivate ? "Only you can see this" : "View only"}
          </span>
          {!isPrivate && <ShareClosetButton slug={slug} closetName={closet.closetName} />}
          {closet.isOwner && (
            // Plain link: the route clears the example-closet cookie.
            // eslint-disable-next-line @next/next/no-html-link-for-pages
            <Button nativeButton={false} render={<a href="/closets/mine" />}>
              <Pencil data-icon="inline-start" />
              Edit my closet
            </Button>
          )}
        </div>
      </header>

      <ReadOnlyCloset items={items} sections={sections} />

      {outfits.length > 0 && (
        <section className="flex flex-col gap-4" aria-labelledby="outfits">
          <h2 id="outfits" className="text-2xl font-bold tracking-tight">
            Outfits
          </h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {outfits.map((outfit) => (
              <li key={outfit.id} className="flex flex-col gap-2">
                <OutfitPreview items={outfit.items} backdrop={outfit.backdrop} />
                <div className="px-0.5">
                  <h3 className="truncate text-sm font-medium">
                    <bdi>{outfit.name}</bdi>
                  </h3>
                  <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    {outfit.occasion && capitalize(outfit.occasion)}
                    {outfit.matchScore !== null && <MatchBadge score={outfit.matchScore} />}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
