import { Suspense } from "react";
import type { Metadata } from "next";

import { ClosetGallery, ClosetGallerySkeleton } from "@/components/closets/closet-gallery";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: { absolute: "FitCheck AI: your closet, styled by AI" },
};

export default function Home() {
  return (
    <LandingPage
      gallery={
        <section
          id="closets"
          className="mx-auto flex w-full max-w-6xl scroll-mt-16 flex-col gap-8 px-4 py-16 sm:px-6"
          aria-labelledby="closets-title"
        >
          <div className="flex flex-col gap-2">
            <h2 id="closets-title" className="text-3xl font-bold tracking-tight">
              Closets
            </h2>
            <p className="text-muted-foreground">
              Look around public closets, or play with the two example closets.
            </p>
          </div>
          <Suspense fallback={<ClosetGallerySkeleton />}>
            <ClosetGallery />
          </Suspense>
        </section>
      }
    />
  );
}
