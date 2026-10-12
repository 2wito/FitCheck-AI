import { z } from "zod";

import { Season } from "@/generated/prisma/browser";
import { OCCASIONS } from "@/lib/clothing";
import { MAX_SCALE, MIN_SCALE } from "@/lib/outfit-layout";

export const MAX_OUTFIT_ITEMS = 20;

const canvasItemSchema = z.object({
  clothingItemId: z.uuid(),
  positionX: z.number().min(0).max(1),
  positionY: z.number().min(0).max(1),
  scale: z.number().min(MIN_SCALE).max(MAX_SCALE),
  zIndex: z.int().min(0).max(1000),
});

export const saveOutfitSchema = z.object({
  // Present when updating an existing outfit, absent when creating one.
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Give your outfit a name").max(80),
  occasion: z.enum(OCCASIONS),
  items: z
    .array(canvasItemSchema)
    .min(1, "Add at least one item to the canvas")
    .max(MAX_OUTFIT_ITEMS, `An outfit can have at most ${MAX_OUTFIT_ITEMS} items`)
    .refine(
      (items) => new Set(items.map((i) => i.clothingItemId)).size === items.length,
      "Each item can only appear once in an outfit",
    ),
});

export type SaveOutfitInput = z.infer<typeof saveOutfitSchema>;

export const generateOutfitSchema = z.object({
  occasion: z.enum(OCCASIONS),
  season: z.enum(Season).nullable(),
});

export type GenerateOutfitInput = z.infer<typeof generateOutfitSchema>;
