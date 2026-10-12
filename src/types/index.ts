// Shared app-level types, derived from the Prisma schema so they never drift from the database.
// Imports come from the browser-safe entry point, so these work in Client Components too.

import type {
  User,
  ClothingItem,
  Outfit,
  OutfitItem,
  Prisma,
} from "@/generated/prisma/browser";
import type { ClothingTags } from "@/lib/validations/clothing";

export { Category, Season } from "@/generated/prisma/browser";
export type { User, ClothingItem, Outfit, OutfitItem, ClothingTags };

// An Outfit with its canvas items and the clothing each one places.
export type OutfitWithItems = Prisma.OutfitGetPayload<{
  include: { items: { include: { clothingItem: true } } };
}>;

// Canvas placement of a single item, as edited by the outfit builder.
export type CanvasTransform = Pick<
  OutfitItem,
  "positionX" | "positionY" | "scale" | "zIndex"
>;

// Result of AI analysis on an uploaded photo. Either part may be null if that step failed,
// in which case the user fills in the tags manually or the original photo is used.
export type ClothingAnalysis = {
  tags: ClothingTags | null;
  cutoutDataUrl: string | null;
};

// Uniform return shape for Server Actions, so forms can render errors without try/catch.
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
