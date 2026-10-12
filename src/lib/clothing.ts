// Display labels and option lists shared by the AI tagger, forms and closet UI.
// Client-safe: enums come from Prisma's browser entry point.

import { Category, Season } from "@/generated/prisma/browser";

export const CATEGORY_LABELS: Record<Category, string> = {
  [Category.TOPS]: "Tops",
  [Category.BOTTOMS]: "Bottoms",
  [Category.SHOES]: "Shoes",
  [Category.OUTERWEAR]: "Outerwear",
  [Category.ACCESSORIES]: "Accessories",
};

export const SEASON_LABELS: Record<Season, string> = {
  [Season.SPRING]: "Spring",
  [Season.SUMMER]: "Summer",
  [Season.AUTUMN]: "Autumn",
  [Season.WINTER]: "Winter",
  [Season.ALL_WEATHER]: "All weather",
};

// A fixed vocabulary keeps style tags consistent, so outfits can be filtered by them later.
export const STYLES = [
  "casual",
  "smart casual",
  "business",
  "formal",
  "sporty",
  "streetwear",
  "party",
  "loungewear",
  "outdoor",
] as const;

export type Style = (typeof STYLES)[number];

export const OCCASIONS = [
  "casual",
  "work",
  "date night",
  "party",
  "formal",
  "active",
  "travel",
] as const;

export type Occasion = (typeof OCCASIONS)[number];

export function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
