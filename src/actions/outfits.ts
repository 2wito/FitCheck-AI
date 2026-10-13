"use server";

import { revalidatePath } from "next/cache";

import { Prisma } from "@/generated/prisma/client";
import { generateOutfit } from "@/lib/ai/stylist";
import { getCurrentUserId, requireUser } from "@/lib/auth";
import { AUTH_ENABLED } from "@/lib/auth-mode";
import { prisma } from "@/lib/prisma";
import {
  generateOutfitSchema,
  saveOutfitSchema,
  type GenerateOutfitInput,
  type SaveOutfitInput,
} from "@/lib/validations/outfit";
import type { ActionResult, StylistSuggestion } from "@/types";

const NOT_SIGNED_IN = { success: false, error: "You must be signed in" } as const;
// requireUser() fails for a missing session with auth on, but only for DB errors in demo mode.
const USER_UNAVAILABLE = AUTH_ENABLED
  ? NOT_SIGNED_IN
  : ({ success: false, error: "Couldn't reach the database. Please try again." } as const);

export async function saveOutfit(
  input: SaveOutfitInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = saveOutfitSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid outfit" };
  }
  const { id, name, occasion, items } = parsed.data;

  let user;
  try {
    user = await requireUser();
  } catch (error) {
    console.error(error);
    return USER_UNAVAILABLE;
  }

  // Every item must come from this user's own closet.
  const ownedCount = await prisma.clothingItem.count({
    where: { userId: user.id, id: { in: items.map((item) => item.clothingItemId) } },
  });
  if (ownedCount !== items.length) {
    return { success: false, error: "Some items are no longer in your closet" };
  }

  try {
    const outfit = id
      ? // Scoping the update to userId means another user's outfit id simply isn't found.
        await prisma.outfit.update({
          where: { id, userId: user.id },
          data: { name, occasion, items: { deleteMany: {}, create: items } },
          select: { id: true },
        })
      : await prisma.outfit.create({
          data: { userId: user.id, name, occasion, items: { create: items } },
          select: { id: true },
        });

    revalidatePath("/outfits");
    return { success: true, data: outfit };
  } catch (error) {
    // P2025: no outfit with this id belongs to the user.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return { success: false, error: "Outfit not found" };
    }
    console.error("Failed to save outfit", error);
    return { success: false, error: "Couldn't save the outfit. Please try again." };
  }
}

export async function deleteOutfit(id: string): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return NOT_SIGNED_IN;

  try {
    const { count } = await prisma.outfit.deleteMany({ where: { id, userId } });
    if (count === 0) return { success: false, error: "Outfit not found" };
  } catch (error) {
    console.error("Failed to delete outfit", error);
    return { success: false, error: "Couldn't delete the outfit. Please try again." };
  }

  revalidatePath("/outfits");
  return { success: true, data: undefined };
}

export async function generateOutfitWithAI(
  input: GenerateOutfitInput,
): Promise<ActionResult<StylistSuggestion>> {
  const parsed = generateOutfitSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Choose an occasion" };

  const userId = await getCurrentUserId();
  if (!userId) return NOT_SIGNED_IN;

  const items = await prisma.clothingItem.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      category: true,
      color: true,
      secondaryColor: true,
      season: true,
      style: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (items.length < 2) {
    return { success: false, error: "Add at least two items to your closet first" };
  }

  try {
    const suggestion = await generateOutfit({ items, ...parsed.data });
    if (suggestion.itemIds.length === 0) {
      return { success: false, error: "The stylist couldn't find a match. Try another occasion." };
    }
    return { success: true, data: suggestion };
  } catch (error) {
    console.error("AI outfit generation failed", error);
    return { success: false, error: "The AI stylist is unavailable right now. Please try again." };
  }
}
