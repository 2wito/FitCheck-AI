"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createSection, deleteSection, setSectionItems } from "@/actions/sections";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { itemImageUrl } from "@/lib/clothing";
import { cn } from "@/lib/utils";
import type { ClosetItem, ClosetSection } from "@/types";

export function NewSectionDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (section: ClosetSection) => void;
}) {
  const [name, setName] = useState("");
  const [isSaving, startSaving] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    startSaving(async () => {
      const result = await createSection(name).catch(() => null);
      if (!result?.success) {
        toast.error(result?.error ?? "Couldn't create the section. Please try again.");
        return;
      }
      setName("");
      onCreated(result.data);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !isSaving && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New section</DialogTitle>
          <DialogDescription>
            Group items your own way, e.g. &ldquo;Elegant&rdquo; or &ldquo;Gym&rdquo;. An item can
            be in several sections.
          </DialogDescription>
        </DialogHeader>
        <form id="new-section-form" onSubmit={handleSubmit}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Elegant"
            maxLength={30}
            aria-label="Section name"
            autoFocus
            required
          />
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" form="new-section-form" disabled={isSaving || !name.trim()}>
            {isSaving && <Loader2 data-icon="inline-start" className="animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Tap items to put them in (or take them out of) a section. Keyed by section id by the
// caller, so the selection resets per section.
export function SectionItemsDialog({
  section,
  items,
  onClose,
}: {
  section: ClosetSection | null;
  items: ClosetItem[];
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(
    () => new Set(items.filter((i) => section && i.sectionIds.includes(section.id)).map((i) => i.id)),
  );
  const [isSaving, startSaving] = useTransition();

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function save() {
    if (!section) return;
    startSaving(async () => {
      const result = await setSectionItems(section.id, [...selected]).catch(() => null);
      if (!result?.success) {
        toast.error(result?.error ?? "Couldn't save. Please try again.");
        return;
      }
      toast.success(`Saved "${section.name}"`);
      onClose();
    });
  }

  return (
    <Dialog open={section !== null} onOpenChange={(open) => !open && !isSaving && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Items in &ldquo;{section?.name}&rdquo;</DialogTitle>
          <DialogDescription>Tap items to add or remove them.</DialogDescription>
        </DialogHeader>
        <ul className="grid max-h-[60vh] grid-cols-3 gap-2 overflow-y-auto p-0.5 sm:grid-cols-4">
          {items.map((item) => {
            const isSelected = selected.has(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  aria-pressed={isSelected}
                  aria-label={item.name}
                  className={cn(
                    "relative block w-full overflow-hidden rounded-xl bg-muted/60 p-2 ring-2 transition",
                    isSelected ? "ring-primary" : "ring-transparent hover:ring-foreground/20",
                  )}
                >
                  <Image
                    src={itemImageUrl(item)}
                    alt=""
                    width={160}
                    height={200}
                    sizes="160px"
                    className="aspect-[4/5] w-full object-contain"
                  />
                  {isSelected && (
                    <span className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-4" />
                    </span>
                  )}
                  <span className="mt-1 block truncate text-xs">{item.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={isSaving}>
            {isSaving && <Loader2 data-icon="inline-start" className="animate-spin" />}
            Save ({selected.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteSectionDialog({
  section,
  onClose,
  onDeleted,
}: {
  section: ClosetSection | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [isDeleting, startDeleting] = useTransition();

  function handleDelete() {
    if (!section) return;
    startDeleting(async () => {
      const result = await deleteSection(section.id).catch(() => null);
      if (!result?.success) {
        toast.error(result?.error ?? "Couldn't delete the section. Please try again.");
        return;
      }
      toast.success(`"${section.name}" deleted`);
      onDeleted();
    });
  }

  return (
    <Dialog open={section !== null} onOpenChange={(open) => !open && !isDeleting && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete &ldquo;{section?.name}&rdquo;?</DialogTitle>
          <DialogDescription>
            The section is removed. Its items stay in your closet.
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
