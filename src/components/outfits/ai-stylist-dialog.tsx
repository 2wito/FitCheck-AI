"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { generateOutfitWithAI } from "@/actions/outfits";
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
import type { Season } from "@/generated/prisma/browser";
import { OCCASIONS, SEASON_LABELS, capitalize, type Occasion } from "@/lib/clothing";
import type { StylistSuggestion } from "@/types";

const ANY_SEASON = "ANY";

const occasionItems = OCCASIONS.map((value) => ({ value, label: capitalize(value) }));
const seasonItems = [
  { value: ANY_SEASON, label: "Any season" },
  ...Object.entries(SEASON_LABELS).map(([value, label]) => ({ value, label })),
];

export function AiStylistDialog({
  canvasHasItems,
  disabled,
  onGenerated,
}: {
  canvasHasItems: boolean;
  disabled: boolean;
  onGenerated: (suggestion: StylistSuggestion, occasion: Occasion) => void;
}) {
  const [open, setOpen] = useState(false);
  const [occasion, setOccasion] = useState<Occasion>("casual");
  const [season, setSeason] = useState(ANY_SEASON);
  const [isGenerating, startGenerating] = useTransition();

  function generate() {
    startGenerating(async () => {
      const result = await generateOutfitWithAI({
        occasion,
        season: season === ANY_SEASON ? null : (season as Season),
      }).catch(() => null);

      if (!result?.success) {
        toast.error(result?.error ?? "Something went wrong. Please try again.");
        return;
      }
      onGenerated(result.data, occasion);
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isGenerating && setOpen(next)}>
      <DialogTrigger render={<Button variant="outline" disabled={disabled} />}>
        <Sparkles data-icon="inline-start" />
        Generate with AI
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>AI stylist</DialogTitle>
          <DialogDescription>
            Pick an occasion and we&apos;ll put together an outfit from your closet.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Occasion">
            <OptionSelect
              label="Occasion"
              items={occasionItems}
              value={occasion}
              onChange={(value) => setOccasion(value as Occasion)}
              disabled={isGenerating}
            />
          </Field>
          <Field label="Season">
            <OptionSelect
              label="Season"
              items={seasonItems}
              value={season}
              onChange={setSeason}
              disabled={isGenerating}
            />
          </Field>
        </div>

        {canvasHasItems && (
          <p className="text-muted-foreground">This replaces the items currently on your canvas.</p>
        )}

        <DialogFooter>
          <Button onClick={generate} disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Sparkles data-icon="inline-start" />
            )}
            {isGenerating ? "Styling your outfit..." : "Generate outfit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
