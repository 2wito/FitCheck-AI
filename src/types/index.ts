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

// AI tags for an uploaded photo; null if tagging failed (the user fills them in instead).
// The background-removed cutout is made in the browser, not returned here.
export type ClothingAnalysis = {
  tags: ClothingTags | null;
};

// One product photo from online image search.
export type ImageSearchResult = {
  imageUrl: string;
  thumbnailUrl: string;
  title: string;
  source: string;
  // Page the image came from (e.g. the product page), when the provider returns it.
  link: string | null;
};

// Analysis of a search result: also returns the downloaded image (re-encoded as WebP),
// so saving reuses the normal upload path.
export type RemoteClothingAnalysis = ClothingAnalysis & { imageDataUrl: string };

// One item placed on the outfit canvas (client-side shape of an OutfitItem).
export type CanvasItem = CanvasTransform & { clothingItemId: string };

// An outfit chosen by the AI stylist, before it's laid out on the canvas.
export type StylistSuggestion = {
  itemIds: string[];
  name: string;
  reasoning: string;
  matchScore: number;
};

// Color & style match for a set of items. "estimate" = rule-based fallback when AI is
// unavailable; "saved" = loaded with a saved outfit.
export type MatchScore = {
  score: number;
  summary: string;
  source: "ai" | "estimate" | "saved";
};

// How often and how recently an item was worn (from OutfitWear). lastWornAt is "YYYY-MM-DD".
export type WearStats = { count: number; lastWornAt: string | null };

// A closet item plus how many saved outfits use it (shown when deleting) and its wear stats.
export type ClosetItem = ClothingItem & {
  _count: { outfitItems: number };
  wear: WearStats;
};

// Current local weather (Open-Meteo), used for "Today's look" and the AI stylist.
export type Weather = {
  temperatureC: number;
  feelsLikeC: number;
  highC: number;
  lowC: number;
  // Highest hourly chance of rain today, 0-100.
  precipitationChance: number;
  code: number;
  condition: string;
  isRaining: boolean;
  isSnowing: boolean;
  isDay: boolean;
  // City from the request's IP geolocation, when known.
  place: string | null;
};

// Uniform return shape for Server Actions, so forms can render errors without try/catch.
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
