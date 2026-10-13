import { z } from "zod";

import { Category, Season } from "@/generated/prisma/browser";
import { STYLES } from "@/lib/clothing";

// One schema for both the AI vision output and the user's review form, so the model can
// only suggest values the form (and database) accept. Descriptions double as model guidance.
export const clothingTagsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(80)
    .describe('Short descriptive name, e.g. "Navy crewneck sweater"'),
  category: z.enum(Category),
  color: z
    .string()
    .trim()
    .min(1, "Primary color is required")
    .max(40)
    .describe('Dominant color as a simple lowercase name, e.g. "navy", "cream", "olive"'),
  secondaryColor: z
    .string()
    .trim()
    .max(40)
    .nullable()
    .describe("Second most visible color, or null if the item is a single color"),
  season: z.enum(Season).describe("The season the item suits best, or ALL_WEATHER"),
  style: z.enum(STYLES).describe("The occasion or style the item fits best"),
});

export type ClothingTags = z.infer<typeof clothingTagsSchema>;

export const searchQuerySchema = z
  .string()
  .trim()
  .min(2, "Type at least 2 characters")
  .max(100, "Keep the search under 100 characters");

const httpUrl = z.url({ protocol: /^https?$/ }).max(2048);

export const remoteImageSchema = z.object({
  imageUrl: httpUrl,
  thumbnailUrl: httpUrl,
});
