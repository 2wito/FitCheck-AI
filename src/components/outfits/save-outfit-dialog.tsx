"use client";

import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";

import { Field, OptionSelect } from "@/components/shared/form-controls";
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
import { Input } from "@/components/ui/input";
import { OCCASIONS, capitalize, type Occasion } from "@/lib/clothing";

export type OutfitDetails = { name: string; occasion: Occasion };

const occasionItems = OCCASIONS.map((value) => ({ value, label: capitalize(value) }));

export function SaveOutfitDialog({
  defaults,
  isExisting,
  disabled,
  onSave,
}: {
  defaults: OutfitDetails;
  isExisting: boolean;
  disabled: boolean;
  // Resolves to true when saved, so the dialog knows whether to close.
  onSave: (details: OutfitDetails, asNew: boolean) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(defaults);
  const [isSaving, startSaving] = useTransition();

  function handleOpenChange(nextOpen: boolean) {
    if (isSaving) return;
    // Pick up the latest name/occasion (e.g. from the AI stylist) each time it opens.
    if (nextOpen) setDetails(defaults);
    setOpen(nextOpen);
  }

  function save(asNew: boolean) {
    startSaving(async () => {
      if (await onSave(details, asNew)) setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button disabled={disabled} />}>
        <Save data-icon="inline-start" />
        Save outfit
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isExisting ? "Save changes" : "Save outfit"}</DialogTitle>
          <DialogDescription>Name your look so you can find it later.</DialogDescription>
        </DialogHeader>

        <form
          id="save-outfit-form"
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            save(false);
          }}
        >
          <Field label="Outfit name" htmlFor="outfit-name">
            <Input
              id="outfit-name"
              value={details.name}
              onChange={(e) => setDetails({ ...details, name: e.target.value })}
              placeholder="Weekend brunch"
              maxLength={80}
              required
              autoFocus
            />
          </Field>
          <Field label="Occasion">
            <OptionSelect
              label="Occasion"
              items={occasionItems}
              value={details.occasion}
              onChange={(occasion) => setDetails({ ...details, occasion: occasion as Occasion })}
            />
          </Field>
        </form>

        <DialogFooter>
          {isExisting && (
            <Button variant="outline" onClick={() => save(true)} disabled={isSaving}>
              Save as new
            </Button>
          )}
          <Button type="submit" form="save-outfit-form" disabled={isSaving}>
            {isSaving && <Loader2 data-icon="inline-start" className="animate-spin" />}
            {isExisting ? "Save changes" : "Save outfit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
