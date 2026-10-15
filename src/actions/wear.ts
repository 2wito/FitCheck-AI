"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUserId } from "@/lib/auth";
import { addDays, keyToDbDate, todayKey } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/types";

const NOT_SIGNED_IN = { success: false, error: "You must be signed in" } as const;

// Dates are the browser's local "YYYY-MM-DD". Wear can't be logged for the future; one day of
// slack covers time zones ahead of the server's UTC clock.
const dateKey = z.iso.date();
const wearDate = dateKey.refine(
  (key) => key <= addDays(todayKey(), 1),
  "You can't log future wear",
);

function revalidateWearViews() {
  revalidatePath("/closet");
  revalidatePath("/planner");
}

// Closet card "Worn today" (or any single day).
export async function markItemsWorn(input: {
  clothingItemIds: string[];
  date: string;
}): Promise<ActionResult<{ added: number }>> {
  const parsed = z
    .object({ clothingItemIds: z.array(z.uuid()).min(1).max(20), date: wearDate })
    .safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const userId = await getCurrentUserId();
  if (!userId) return NOT_SIGNED_IN;

  const { clothingItemIds, date } = parsed.data;
  const owned = await prisma.clothingItem.count({ where: { userId, id: { in: clothingItemIds } } });
  if (owned !== clothingItemIds.length) return { success: false, error: "Item not found" };

  const { count } = await prisma.outfitWear.createMany({
    data: clothingItemIds.map((clothingItemId) => ({
      userId,
      clothingItemId,
      wornAt: keyToDbDate(date),
    })),
    skipDuplicates: true,
  });
  revalidateWearViews();
  return { success: true, data: { added: count } };
}

// Undo for "Worn today".
export async function unmarkItemWorn(input: {
  clothingItemId: string;
  date: string;
}): Promise<ActionResult> {
  const parsed = z.object({ clothingItemId: z.uuid(), date: dateKey }).safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };

  const userId = await getCurrentUserId();
  if (!userId) return NOT_SIGNED_IN;

  await prisma.outfitWear.deleteMany({
    where: {
      userId,
      clothingItemId: parsed.data.clothingItemId,
      wornAt: keyToDbDate(parsed.data.date),
    },
  });
  revalidateWearViews();
  return { success: true, data: undefined };
}

// Planner: assign (or replace) the outfit for a day.
export async function planOutfit(input: { date: string; outfitId: string }): Promise<ActionResult> {
  const parsed = z.object({ date: dateKey, outfitId: z.uuid() }).safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };

  const userId = await getCurrentUserId();
  if (!userId) return NOT_SIGNED_IN;

  const outfit = await prisma.outfit.findFirst({
    where: { id: parsed.data.outfitId, userId },
    select: { id: true },
  });
  if (!outfit) return { success: false, error: "Outfit not found" };

  const date = keyToDbDate(parsed.data.date);
  await prisma.outfitPlan.upsert({
    where: { userId_date: { userId, date } },
    update: { outfitId: outfit.id },
    create: { userId, outfitId: outfit.id, date },
  });
  revalidatePath("/planner");
  return { success: true, data: undefined };
}

export async function clearPlan(input: { date: string }): Promise<ActionResult> {
  const parsed = z.object({ date: dateKey }).safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };

  const userId = await getCurrentUserId();
  if (!userId) return NOT_SIGNED_IN;

  await prisma.outfitPlan.deleteMany({ where: { userId, date: keyToDbDate(parsed.data.date) } });
  revalidatePath("/planner");
  return { success: true, data: undefined };
}

// Planner: log every piece of an outfit as worn on a day.
export async function markOutfitWorn(input: {
  outfitId: string;
  date: string;
}): Promise<ActionResult> {
  const parsed = z.object({ outfitId: z.uuid(), date: wearDate }).safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const userId = await getCurrentUserId();
  if (!userId) return NOT_SIGNED_IN;

  const outfit = await prisma.outfit.findFirst({
    where: { id: parsed.data.outfitId, userId },
    select: { id: true, items: { select: { clothingItemId: true } } },
  });
  if (!outfit) return { success: false, error: "Outfit not found" };
  if (outfit.items.length === 0) return { success: false, error: "This outfit has no items" };

  const wornAt = keyToDbDate(parsed.data.date);
  await prisma.outfitWear.createMany({
    data: outfit.items.map(({ clothingItemId }) => ({
      userId,
      outfitId: outfit.id,
      clothingItemId,
      wornAt,
    })),
    skipDuplicates: true,
  });
  revalidateWearViews();
  return { success: true, data: undefined };
}

export async function unmarkOutfitWorn(input: {
  outfitId: string;
  date: string;
}): Promise<ActionResult> {
  const parsed = z.object({ outfitId: z.uuid(), date: dateKey }).safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };

  const userId = await getCurrentUserId();
  if (!userId) return NOT_SIGNED_IN;

  await prisma.outfitWear.deleteMany({
    where: { userId, outfitId: parsed.data.outfitId, wornAt: keyToDbDate(parsed.data.date) },
  });
  revalidateWearViews();
  return { success: true, data: undefined };
}
