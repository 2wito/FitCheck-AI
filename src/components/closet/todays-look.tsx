"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarCheck, Loader2, Palette, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { generateOutfitWithAI } from "@/actions/outfits";
import { markItemsWorn } from "@/actions/wear";
import { MatchBadge } from "@/components/outfits/match-score";
import { OptionSelect } from "@/components/shared/form-controls";
import { WeatherSummary } from "@/components/shared/weather-summary";
import { Button } from "@/components/ui/button";
import { useWeather } from "@/hooks/use-weather";
import { OCCASIONS, capitalize, type Occasion } from "@/lib/clothing";
import { todayKey } from "@/lib/dates";
import type { ClosetItem, StylistSuggestion } from "@/types";

const occasionItems = OCCASIONS.map((value) => ({ value, label: capitalize(value) }));

// Weather-aware daily outfit suggestion at the top of the closet.
export function TodaysLook({ closetItems }: { closetItems: ClosetItem[] }) {
  const { state, requestLocation } = useWeather();
  const [occasion, setOccasion] = useState<Occasion>("casual");
  const [look, setLook] = useState<StylistSuggestion | null>(null);
  const [isStyling, startStyling] = useTransition();
  const [isLogging, startLogging] = useTransition();
  const [logged, setLogged] = useState(false);

  const weather = state.status === "ready" ? state.weather : null;
  const byId = new Map(closetItems.map((item) => [item.id, item]));
  const pieces = look?.itemIds.flatMap((id) => byId.get(id) ?? []) ?? [];

  function styleToday() {
    startStyling(async () => {
      const result = await generateOutfitWithAI({
        occasion,
        season: null,
        weather,
        today: todayKey(),
      }).catch(() => null);
      if (!result?.success) {
        toast.error(result?.error ?? "The stylist is unavailable right now. Please try again.");
        return;
      }
      setLook(result.data);
      setLogged(false);
    });
  }

  function wearToday() {
    if (!look) return;
    startLogging(async () => {
      const result = await markItemsWorn({ clothingItemIds: look.itemIds, date: todayKey() }).catch(
        () => null,
      );
      if (!result?.success) {
        toast.error(result?.error ?? "Couldn't log that. Please try again.");
        return;
      }
      setLogged(true);
      toast.success("Logged as today's outfit");
    });
  }

  return (
    <section
      aria-labelledby="todays-look-heading"
      className="flex flex-col gap-4 rounded-2xl border bg-gradient-to-br from-amber-50 to-sky-50 p-4 sm:p-5 dark:from-amber-950/30 dark:to-sky-950/30"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h2 id="todays-look-heading" className="flex items-center gap-1.5 font-semibold">
            <Sparkles className="size-4" />
            Today&apos;s look
          </h2>
          <WeatherSummary state={state} onRequestLocation={requestLocation} />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-36">
            <OptionSelect
              label="Occasion"
              items={occasionItems}
              value={occasion}
              onChange={(value) => setOccasion(value as Occasion)}
              disabled={isStyling}
            />
          </div>
          <Button onClick={styleToday} disabled={isStyling || state.status === "loading"}>
            {isStyling ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Sparkles data-icon="inline-start" />
            )}
            {look ? "Restyle" : "Style me"}
          </Button>
        </div>
      </div>

      {look && pieces.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-foreground/10 pt-4 sm:flex-row sm:items-center">
          <ul className="flex gap-2 overflow-x-auto">
            {pieces.map((item) => (
              <li
                key={item.id}
                className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-background/70 ring-1 ring-foreground/10"
              >
                <Image
                  src={item.bgRemovedUrl ?? item.imageUrl}
                  alt={item.name}
                  fill
                  sizes="80px"
                  className="object-contain p-1.5"
                />
              </li>
            ))}
          </ul>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="flex flex-wrap items-center gap-2 font-medium">
              {look.name}
              <MatchBadge score={look.matchScore} />
            </p>
            <p className="text-sm text-muted-foreground">{look.reasoning}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={`/outfits/builder?add=${look.itemIds.join(",")}`} />}
            >
              <Palette data-icon="inline-start" />
              Open in canvas
            </Button>
            <Button size="sm" onClick={wearToday} disabled={isLogging || logged}>
              {isLogging ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <CalendarCheck data-icon="inline-start" />
              )}
              {logged ? "Logged" : "Wear today"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
