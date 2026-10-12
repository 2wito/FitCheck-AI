"use client";

import { useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Download, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteTryOn } from "@/actions/try-on";
import { Button } from "@/components/ui/button";

export function SavedTryOnCard({
  id,
  imageUrl,
  outfit,
  createdAt,
}: {
  id: string;
  imageUrl: string;
  outfit: { id: string; name: string } | null;
  createdAt: Date;
}) {
  const [isDeleting, startDeleting] = useTransition();

  function handleDelete() {
    startDeleting(async () => {
      const result = await deleteTryOn(id).catch(() => null);
      if (!result?.success) {
        toast.error(result?.error ?? "Couldn't delete the try-on. Please try again.");
      }
    });
  }

  return (
    <article className="flex flex-col gap-2">
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/5">
        {/* Signed URL: changes on every load, so skip the image optimizer's cache. */}
        <Image src={imageUrl} alt={outfit ? `Try-on of ${outfit.name}` : "Saved try-on"} fill unoptimized className="object-cover" />
      </div>
      <div className="flex items-start justify-between gap-2 px-0.5">
        <div className="min-w-0 text-sm">
          {outfit ? (
            <Link href={`/outfits/builder?id=${outfit.id}`} className="block truncate font-medium hover:underline">
              {outfit.name}
            </Link>
          ) : (
            <p className="font-medium">Canvas look</p>
          )}
          <p className="text-xs text-muted-foreground">
            {createdAt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Download"
            nativeButton={false}
            render={<a href={imageUrl} download target="_blank" rel="noreferrer" />}
          >
            <Download />
          </Button>
          <Button variant="outline" size="icon-sm" aria-label="Delete" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
          </Button>
        </div>
      </div>
    </article>
  );
}
