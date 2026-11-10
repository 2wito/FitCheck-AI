"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUserId, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ActionResult, ClosetSection } from "@/types";

const NOT_SIGNED_IN = { success: false, error: "You must be signed in" } as const;

const nameSchema = z
  .string()
  .trim()
  .min(1, "Give the section a name")
  .max(30, "Keep it under 30 characters");
const idSchema = z.uuid();

// Custom closet sections (e.g. "Elegant"). Every query is scoped to the current user.
export async function createSection(name: string): Promise<ActionResult<ClosetSection>> {
  let userId: string;
  try {
    userId = (await requireUser()).id;
  } catch {
    return NOT_SIGNED_IN;
  }

  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid name" };
  }

  const existing = await prisma.section.findFirst({
    where: { userId, name: { equals: parsed.data, mode: "insensitive" } },
  });
  if (existing) return { success: false, error: `"${existing.name}" already exists` };

  const section = await prisma.section.create({ data: { userId, name: parsed.data } });
  revalidatePath("/closet");
  return { success: true, data: { id: section.id, name: section.name } };
}

export async function deleteSection(id: string): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return NOT_SIGNED_IN;
  if (!idSchema.safeParse(id).success) return { success: false, error: "Section not found" };

  // Items stay in the closet; only the grouping is removed.
  const { count } = await prisma.section.deleteMany({ where: { id, userId } });
  if (count === 0) return { success: false, error: "Section not found" };

  revalidatePath("/closet");
  return { success: true, data: undefined };
}

// Replaces the section's items with exactly these (from the "Choose items" picker).
export async function setSectionItems(id: string, itemIds: string[]): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return NOT_SIGNED_IN;

  const parsed = z
    .object({ id: idSchema, itemIds: z.array(idSchema).max(1000) })
    .safeParse({ id, itemIds });
  if (!parsed.success) return { success: false, error: "Invalid selection" };

  const section = await prisma.section.findFirst({ where: { id, userId }, select: { id: true } });
  if (!section) return { success: false, error: "Section not found" };

  // Only the user's own items can be added.
  const owned = await prisma.clothingItem.findMany({
    where: { userId, id: { in: parsed.data.itemIds } },
    select: { id: true },
  });

  await prisma.section.update({ where: { id }, data: { items: { set: owned } } });
  revalidatePath("/closet");
  return { success: true, data: undefined };
}
