import { Suspense } from "react";
import type { Metadata } from "next";
import { Heart } from "lucide-react";

import { BodyPhotoUpload } from "@/components/profile/body-photo-upload";
import { SavedTryOnCard } from "@/components/profile/saved-try-on-card";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSignedUrls } from "@/lib/storage";

export const metadata: Metadata = {
  title: "Profile",
};

export default function ProfilePage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Your try-on photo and favorite looks.</p>
      </header>

      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileContent />
      </Suspense>
    </main>
  );
}

// Reads the session cookie and signs private URLs, so it renders per request.
async function ProfileContent() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return <p className="text-muted-foreground">Sign in to manage your profile.</p>;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      bodyPhotoPath: true,
      tryOns: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          imagePath: true,
          createdAt: true,
          outfit: { select: { id: true, name: true } },
        },
      },
    },
  });

  const tryOns = user?.tryOns ?? [];
  const signed = await getSignedUrls([
    ...(user?.bodyPhotoPath ? [user.bodyPhotoPath] : []),
    ...tryOns.map((tryOn) => tryOn.imagePath),
  ]);

  return (
    <div className="grid gap-10 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <section className="flex flex-col gap-4 rounded-xl border bg-card p-5" aria-labelledby="body-photo-heading">
        <div>
          <h2 id="body-photo-heading" className="font-medium">
            Try-on photo
          </h2>
          <p className="text-sm text-muted-foreground">
            A full-body photo the AI uses to show outfits on you.
          </p>
        </div>
        <BodyPhotoUpload
          initialUrl={user?.bodyPhotoPath ? (signed.get(user.bodyPhotoPath) ?? null) : null}
        />
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="favorites-heading">
        <h2 id="favorites-heading" className="font-medium">
          Favorite try-ons
        </h2>
        {tryOns.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Heart className="size-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">No favorites yet</p>
              <p className="text-sm text-muted-foreground">
                Use &ldquo;Try on me&rdquo; on an outfit and save the looks you love.
              </p>
            </div>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {tryOns.flatMap((tryOn) => {
              const imageUrl = signed.get(tryOn.imagePath);
              return imageUrl
                ? [
                    <li key={tryOn.id}>
                      <SavedTryOnCard
                        id={tryOn.id}
                        imageUrl={imageUrl}
                        outfit={tryOn.outfit}
                        createdAt={tryOn.createdAt}
                      />
                    </li>,
                  ]
                : [];
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="grid gap-10 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <Skeleton className="h-[28rem] rounded-xl" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
