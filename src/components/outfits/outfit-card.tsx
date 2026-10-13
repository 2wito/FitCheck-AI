"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteOutfit } from "@/actions/outfits";
import { MatchBadge } from "@/components/outfits/match-score";
import { OutfitPreview } from "@/components/outfits/outfit-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { capitalize } from "@/lib/clothing";
import type { OutfitWithItems } from "@/types";

export function OutfitCard({ outfit }: { outfit: OutfitWithItems }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, startDeleting] = useTransition();
  const editHref = `/outfits/builder?id=${outfit.id}`;

  function handleDelete() {
    startDeleting(async () => {
      const result = await deleteOutfit(outfit.id).catch(() => null);
      if (!result?.success) {
        toast.error(result?.error ?? "Couldn't delete the outfit. Please try again.");
        return;
      }
      setConfirmOpen(false);
      toast.success(`"${outfit.name}" deleted`);
    });
  }

  return (
    <article className="group flex flex-col gap-2">
      <Link href={editHref} aria-label={`Open ${outfit.name} in the canvas`}>
        <OutfitPreview
          items={outfit.items}
          backdrop={outfit.backdrop}
          className="transition-shadow group-hover:ring-foreground/20 group-hover:shadow-md"
        />
      </Link>

      <div className="flex items-start justify-between gap-2 px-0.5">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium">{outfit.name}</h3>
          <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {outfit.items.length} {outfit.items.length === 1 ? "item" : "items"}
            {outfit.matchScore !== null && <MatchBadge score={outfit.matchScore} />}
          </p>
        </div>
        {outfit.occasion && <Badge variant="secondary">{capitalize(outfit.occasion)}</Badge>}
      </div>

      <div className="flex gap-2 px-0.5">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          nativeButton={false}
          render={<Link href={editHref} />}
        >
          <Pencil data-icon="inline-start" />
          Open in canvas
        </Button>

        <Dialog open={confirmOpen} onOpenChange={(open) => !isDeleting && setConfirmOpen(open)}>
          <DialogTrigger
            render={<Button variant="outline" size="icon-sm" aria-label={`Delete ${outfit.name}`} />}
          >
            <Trash2 />
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this outfit?</DialogTitle>
              <DialogDescription>
                &ldquo;{outfit.name}&rdquo; will be removed. The clothes stay in your closet.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting && <Loader2 data-icon="inline-start" className="animate-spin" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </article>
  );
}
