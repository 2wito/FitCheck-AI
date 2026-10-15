"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CalendarCheck, ChevronLeft, ChevronRight, Loader2, Undo2, X } from "lucide-react";
import { toast } from "sonner";

import { clearPlan, markOutfitWorn, planOutfit, unmarkOutfitWorn } from "@/actions/wear";
import { OutfitPreview } from "@/components/outfits/outfit-preview";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { addDays, keyToDbDate, todayKey } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { OutfitWithItems } from "@/types";

export type PlannerDay = {
  plannedOutfitId: string | null;
  wornOutfitIds: string[];
  // Individual pieces logged as worn that day (from outfits or the closet's "Worn today").
  wornItems: number;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function shiftMonth(month: string, delta: number) {
  const date = keyToDbDate(`${month}-01`);
  date.setUTCMonth(date.getUTCMonth() + delta);
  return date.toISOString().slice(0, 7);
}

export function PlannerCalendar({
  month,
  gridStart,
  days,
  outfits,
}: {
  month: string;
  gridStart: string;
  days: Record<string, PlannerDay>;
  outfits: OutfitWithItems[];
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const today = todayKey();
  const outfitsById = new Map(outfits.map((o) => [o.id, o]));
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const monthLabel = keyToDbDate(`${month}-01`).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold" suppressHydrationWarning>
          {monthLabel}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous month"
            nativeButton={false}
            render={<Link href={`/planner?month=${shiftMonth(month, -1)}`} />}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/planner" />}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next month"
            nativeButton={false}
            render={<Link href={`/planner?month=${shiftMonth(month, 1)}`} />}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      {outfits.length === 0 && (
        <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
          Save an outfit first, then plan it here.{" "}
          <Link
            href="/outfits/builder"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Create an outfit
          </Link>
        </p>
      )}

      <div
        className="grid grid-cols-7 gap-1 sm:gap-2"
        role="grid"
        aria-label={`Outfit plan for ${monthLabel}`}
      >
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            className="pb-1 text-center text-xs font-medium text-muted-foreground"
            role="columnheader"
          >
            {weekday}
          </div>
        ))}
        {cells.map((date) => {
          const info = days[date];
          const planned = info?.plannedOutfitId ? outfitsById.get(info.plannedOutfitId) : undefined;
          const worn = Boolean(info?.wornItems);
          const inMonth = date.startsWith(month);
          return (
            <button
              key={date}
              type="button"
              role="gridcell"
              onClick={() => setSelected(date)}
              aria-label={`${date}${planned ? `, planned: ${planned.name}` : ""}${worn ? ", worn" : ""}`}
              className={cn(
                "group relative flex min-h-20 flex-col gap-1 rounded-lg border p-1 text-left transition-colors sm:min-h-32 sm:p-1.5",
                "hover:border-foreground/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                !inMonth && "opacity-45",
                date === today && "border-foreground/60 ring-1 ring-foreground/40",
              )}
              suppressHydrationWarning
            >
              <span className="flex items-center justify-between text-xs">
                <span className={cn("tabular-nums", date === today && "font-semibold")}>
                  {Number(date.slice(8))}
                </span>
                {worn && (
                  <CalendarCheck
                    className="size-3.5 text-emerald-600 dark:text-emerald-400"
                    aria-hidden
                  />
                )}
              </span>
              {planned && (
                <OutfitPreview
                  items={planned.items}
                  backdrop={planned.backdrop}
                  className="w-full rounded-md"
                />
              )}
            </button>
          );
        })}
      </div>

      <DayDialog
        key={selected ?? "none"}
        date={selected}
        info={selected ? days[selected] : undefined}
        outfits={outfits}
        today={today}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

function DayDialog({
  date,
  info,
  outfits,
  today,
  onClose,
}: {
  date: string | null;
  info: PlannerDay | undefined;
  outfits: OutfitWithItems[];
  today: string;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const planned = outfits.find((o) => o.id === info?.plannedOutfitId) ?? null;
  const plannedWorn = planned ? (info?.wornOutfitIds.includes(planned.id) ?? false) : false;
  const canLogWear = date !== null && date <= today;

  function run(
    action: () => Promise<{ success: boolean; error?: string } | null>,
    success: string,
  ) {
    startTransition(async () => {
      const result = await action().catch(() => null);
      if (!result?.success) {
        toast.error(result?.error ?? "Something went wrong. Please try again.");
        return;
      }
      toast.success(success);
    });
  }

  const label = date
    ? keyToDbDate(date).toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      })
    : "";

  return (
    <Dialog open={date !== null} onOpenChange={(open) => !open && !isPending && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>
            {planned ? `Planned: ${planned.name}` : "Pick an outfit to plan for this day."}
            {info?.wornItems
              ? ` · ${info.wornItems} piece${info.wornItems === 1 ? "" : "s"} logged as worn`
              : ""}
          </DialogDescription>
        </DialogHeader>

        {outfits.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You don&apos;t have any saved outfits yet.
          </p>
        ) : (
          <ul className="grid max-h-[50vh] grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4">
            {outfits.map((outfit) => (
              <li key={outfit.id}>
                <button
                  type="button"
                  disabled={isPending}
                  aria-pressed={planned?.id === outfit.id}
                  onClick={() =>
                    date &&
                    run(() => planOutfit({ date, outfitId: outfit.id }), `Planned "${outfit.name}"`)
                  }
                  className={cn(
                    "flex w-full flex-col gap-1 rounded-lg p-1 text-left transition-colors hover:bg-muted",
                    planned?.id === outfit.id && "bg-muted ring-2 ring-foreground",
                  )}
                >
                  <OutfitPreview
                    items={outfit.items}
                    backdrop={outfit.backdrop}
                    className="w-full"
                  />
                  <span className="truncate text-xs font-medium">{outfit.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <DialogFooter>
          {planned && (
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() => date && run(() => clearPlan({ date }), "Plan removed")}
            >
              <X data-icon="inline-start" />
              Remove plan
            </Button>
          )}
          {planned &&
            canLogWear &&
            (plannedWorn ? (
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() =>
                  date &&
                  run(() => unmarkOutfitWorn({ outfitId: planned.id, date }), "Wear log removed")
                }
              >
                <Undo2 data-icon="inline-start" />
                Undo worn
              </Button>
            ) : (
              <Button
                disabled={isPending}
                onClick={() =>
                  date &&
                  run(
                    () => markOutfitWorn({ outfitId: planned.id, date }),
                    date === today ? "Logged as worn today" : "Logged as worn",
                  )
                }
              >
                {isPending ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <CalendarCheck data-icon="inline-start" />
                )}
                {date === today ? "Worn today" : "Mark as worn"}
              </Button>
            ))}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
