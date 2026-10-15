import { Suspense } from "react";
import type { Metadata } from "next";

import { PlannerCalendar, type PlannerDay } from "@/components/planner/planner-calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUserId } from "@/lib/auth";
import { addDays, dbDateToKey, keyToDbDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Outfit Planner",
};

export default function PlannerPage({ searchParams }: PageProps<"/planner">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Outfit Planner</h1>
        <p className="text-muted-foreground">
          Plan your week and log what you wear. The AI stylist uses this to keep your looks fresh.
        </p>
      </header>
      <Suspense fallback={<Skeleton className="h-[36rem] rounded-2xl" />}>
        <Planner searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

// `?month=YYYY-MM` picks the month; default is the current month.
async function Planner({ searchParams }: Pick<PageProps<"/planner">, "searchParams">) {
  const { month: monthParam } = await searchParams;
  const userId = await requireUserId();

  const month =
    typeof monthParam === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam)
      ? monthParam
      : new Date().toISOString().slice(0, 7);

  // Six-week grid starting on the Sunday on or before the 1st.
  const first = `${month}-01`;
  const gridStart = addDays(first, -keyToDbDate(first).getUTCDay());
  const gridEnd = addDays(gridStart, 41);
  const range = { gte: keyToDbDate(gridStart), lte: keyToDbDate(gridEnd) };

  const [outfits, plans, wears] = await Promise.all([
    prisma.outfit.findMany({
      where: { userId },
      include: { items: { include: { clothingItem: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.outfitPlan.findMany({
      where: { userId, date: range },
      select: { date: true, outfitId: true },
    }),
    prisma.outfitWear.findMany({
      where: { userId, wornAt: range },
      select: { wornAt: true, outfitId: true },
    }),
  ]);

  const days: Record<string, PlannerDay> = {};
  const day = (key: string) =>
    (days[key] ??= { plannedOutfitId: null, wornOutfitIds: [], wornItems: 0 });
  for (const plan of plans) day(dbDateToKey(plan.date)).plannedOutfitId = plan.outfitId;
  for (const wear of wears) {
    const entry = day(dbDateToKey(wear.wornAt));
    entry.wornItems++;
    if (wear.outfitId && !entry.wornOutfitIds.includes(wear.outfitId))
      entry.wornOutfitIds.push(wear.outfitId);
  }

  return <PlannerCalendar month={month} gridStart={gridStart} days={days} outfits={outfits} />;
}
