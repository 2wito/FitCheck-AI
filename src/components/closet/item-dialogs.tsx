"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { deleteClothingItem, updateClothingItem } from "@/actions/closet";
import {
  ClothingFields,
  toFormValues,
  toTags,
  type ClothingFormValues,
} from "@/components/closet/clothing-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ClosetItem } from "@/types";

// "Edit tags" quick action. Keyed by item id by the caller, so the form resets per item.
export function EditItemDialog({
  item,
  onClose,
}: {
  item: ClosetItem | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ClothingFormValues | null>(item ? toFormValues(item) : null);
  const [isSaving, startSaving] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!item || !form) return;
    startSaving(async () => {
      const result = await updateClothingItem(item.id, toTags(form)).catch(() => null);
      if (!result?.success) {
        toast.error(result?.error ?? "Couldn't save changes. Please try again.");
        return;
      }
      toast.success("Item updated");
      onClose();
    });
  }

  return (
    <Dialog open={item !== null} onOpenChange={(open) => !open && !isSaving && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit tags</DialogTitle>
          <DialogDescription>Adjust how this item is categorized and filtered.</DialogDescription>
        </DialogHeader>
        {form && (
          <form id="edit-item-form" onSubmit={handleSubmit}>
            <ClothingFields value={form} onChange={setForm} idPrefix="edit" />
          </form>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" form="edit-item-form" disabled={isSaving}>
            {isSaving && <Loader2 data-icon="inline-start" className="animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteItemDialog({
  item,
  onClose,
}: {
  item: ClosetItem | null;
  onClose: () => void;
}) {
  const [isDeleting, startDeleting] = useTransition();
  const outfitCount = item?._count.outfitItems ?? 0;

  function handleDelete() {
    if (!item) return;
    startDeleting(async () => {
      const result = await deleteClothingItem(item.id).catch(() => null);
      if (!result?.success) {
        toast.error(result?.error ?? "Couldn't delete the item. Please try again.");
        return;
      }
      toast.success(`"${item.name}" deleted`);
      onClose();
    });
  }

  return (
    <Dialog open={item !== null} onOpenChange={(open) => !open && !isDeleting && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this item?</DialogTitle>
          <DialogDescription>
            &ldquo;{item?.name}&rdquo; will be removed from your closet
            {outfitCount > 0
              ? ` and from ${outfitCount} saved ${outfitCount === 1 ? "outfit" : "outfits"}`
              : ""}
            . This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting && <Loader2 data-icon="inline-start" className="animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
