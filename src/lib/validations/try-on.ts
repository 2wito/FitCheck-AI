import { z } from "zod";

// Image models accept a limited number of reference images; one slot is the body photo.
export const MAX_TRY_ON_ITEMS = 6;

export const tryOnSchema = z.object({
  clothingItemIds: z
    .array(z.uuid())
    .min(1, "Add at least one item to try on")
    .max(MAX_TRY_ON_ITEMS, `Try-on supports up to ${MAX_TRY_ON_ITEMS} items at a time`),
});

export type TryOnInput = z.infer<typeof tryOnSchema>;
