import { z } from "zod";

import { Season } from "@/generated/prisma/browser";
import { BACKDROP_IDS } from "@/lib/backdrops";
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
  backdrop: z.enum(BACKDROP_IDS).nullable(),
  // Only sent when the score matches the items being saved (see canvas staleness check).
  match: z
    .object({
      score: z.int().min(0).max(100),
      summary: z.string().trim().max(500),
    })
    .nullable(),
});

export type SaveOutfitInput = z.infer<typeof saveOutfitSchema>;

// Weather as fetched by getWeather; validated because it arrives from the browser.
export const weatherSchema = z.object({
  temperatureC: z.number().min(-90).max(70),
  feelsLikeC: z.number().min(-90).max(80),
  highC: z.number().min(-90).max(70),
  lowC: z.number().min(-90).max(70),
  precipitationChance: z.number().min(0).max(100),
  code: z.int().min(0).max(99),
  condition: z.string().max(40),
  isRaining: z.boolean(),
  isSnowing: z.boolean(),
  isDay: z.boolean(),
  place: z.string().max(80).nullable(),
});

export const generateOutfitSchema = z.object({
  occasion: z.enum(OCCASIONS),
  season: z.enum(Season).nullable(),
  // When present, used instead of the season.
  weather: weatherSchema.nullable().optional(),
  // The browser's local date, for "worn in the last 7 days".
  today: z.iso.date().optional(),
});

export type GenerateOutfitInput = z.infer<typeof generateOutfitSchema>;

export const scoreOutfitSchema = z.object({
  clothingItemIds: z
    .array(z.uuid())
    .min(2, "Add at least two items to get a match score")
    .max(MAX_OUTFIT_ITEMS),
  occasion: z.enum(OCCASIONS).nullable(),
});

export type ScoreOutfitInput = z.infer<typeof scoreOutfitSchema>;
