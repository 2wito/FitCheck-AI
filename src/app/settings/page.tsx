import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LogOut, TriangleAlert } from "lucide-react";

import { signOut } from "@/actions/auth";
import {
  AddLoginForm,
  DeleteClosetForm,
  ShareClosetButton,
} from "@/components/closets/account-forms";
import { ProfileForm } from "@/components/closets/profile-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionProfile } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Closet settings",
};

export default function SettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-3xl font-bold tracking-tight">Closet settings</h1>
      <Suspense fallback={<Skeleton className="h-[36rem] rounded-3xl" />}>
        <Settings />
      </Suspense>
    </main>
  );
}

async function Settings() {
  const profile = await getSessionProfile();
  // Signed in without a closet yet, or not signed in at all.
  if (!profile?.closetName) redirect("/create");

  return (
    <>
      {!profile.hasLogin && (
        <Card
          title="Keep your closet safe"
          note="Your closet has no email and password, so only this browser can edit it. Add them to sign in from any device, or to make it private."
          warning
        >
          <AddLoginForm />
        </Card>
      )}

      <Card title="Profile">
        <ProfileForm
          mode="edit"
          askForLogin={false}
          initial={{
            closetName: profile.closetName,
            name: profile.name,
            avatarUrl: profile.avatarUrl,
            visibility: profile.visibility,
            gender: profile.gender,
            city: profile.city,
            age: profile.age,
          }}
        />
      </Card>

      {profile.slug && profile.visibility === "PUBLIC" && (
        <Card title="Share" note="Anyone with the link can look, but only you can edit.">
          <div className="flex flex-wrap items-center gap-3">
            <code className="rounded-lg bg-muted px-3 py-1.5 text-sm break-all">
              /c/{profile.slug}
            </code>
            <ShareClosetButton slug={profile.slug} closetName={profile.closetName} />
          </div>
        </Card>
      )}

      {profile.hasLogin && (
        <Card title="Account" note={`Signed in as ${profile.email}`}>
          <form action={signOut}>
            <Button type="submit" variant="outline">
              <LogOut data-icon="inline-start" />
              Sign out
            </Button>
          </form>
        </Card>
      )}

      <Card
        title="Delete closet"
        note="Deletes your closet, clothes, outfits and photos for good. This can't be undone."
      >
        <DeleteClosetForm closetName={profile.closetName} />
      </Card>
    </>
  );
}

function Card({
  title,
  note,
  warning = false,
  children,
}: {
  title: string;
  note?: string;
  warning?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-4 rounded-3xl border p-5 sm:p-6",
        warning ? "border-amber-500/40 bg-amber-500/10" : "bg-card",
      )}
    >
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          {warning && <TriangleAlert className="size-5 text-amber-600" aria-hidden />}
          {title}
        </h2>
        {note && <p className="text-sm text-muted-foreground">{note}</p>}
      </div>
      {children}
    </section>
  );
}
