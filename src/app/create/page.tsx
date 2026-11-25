import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ProfileForm } from "@/components/closets/profile-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionProfile, getSessionUserId } from "@/lib/auth";
import { AUTH_ENABLED } from "@/lib/auth-mode";

export const metadata: Metadata = {
  title: "Create your closet",
  description: "Open your own closet on FitCheck AI in under a minute, public or private.",
};

export default function CreatePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Create your closet</h1>
        <p className="text-muted-foreground">
          Takes less than a minute. Already have one?{" "}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </header>
      {AUTH_ENABLED ? (
        <Suspense fallback={<Skeleton className="h-[36rem] rounded-3xl" />}>
          <Create />
        </Suspense>
      ) : (
        <p className="rounded-3xl border p-6">Creating closets is turned off right now.</p>
      )}
    </main>
  );
}

async function Create() {
  const userId = await getSessionUserId();
  const profile = await getSessionProfile();

  if (profile?.closetName) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-3xl border bg-card p-6">
        <p>
          You already have a closet: <bdi className="font-semibold">{profile.closetName}</bdi>
        </p>
        {/* Plain link: the route clears the example-closet cookie. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <Button className="h-11 px-5 text-base" nativeButton={false} render={<a href="/closets/mine" />}>
          Open my closet
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border bg-card p-5 shadow-sm sm:p-8">
      <ProfileForm
        mode="create"
        askForLogin={!userId}
        initial={{
          closetName: null,
          name: profile?.name ?? null,
          avatarUrl: profile?.avatarUrl ?? null,
          visibility: "PUBLIC",
          gender: null,
          city: null,
          age: null,
        }}
      />
    </div>
  );
}
