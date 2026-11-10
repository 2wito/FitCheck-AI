// Display labels and option lists shared by the AI tagger, forms and closet UI.
// Client-safe: enums come from Prisma's browser entry point.

import { Category, ItemType, Season } from "@/generated/prisma/browser";

export const CATEGORY_LABELS: Record<Category, string> = {
  [Category.TOPS]: "Tops",
  [Category.BOTTOMS]: "Bottoms",
  [Category.SHOES]: "Shoes",
  [Category.OUTERWEAR]: "Outerwear",
  [Category.ACCESSORIES]: "Accessories",
};

// Closet sections, in display order. Plural labels: they name a group of items.
export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  [ItemType.SHIRT]: "Shirts",
  [ItemType.HOODIE]: "Hoodies",
  [ItemType.JACKET]: "Jackets",
  [ItemType.PANTS]: "Pants",
  [ItemType.SHORTS]: "Shorts",
  [ItemType.JEANS]: "Jeans",
  [ItemType.COAT]: "Coats",
  [ItemType.SHOES]: "Shoes",
  [ItemType.ACCESSORY]: "Accessories",
};

// One item's type, for badges.
export const ITEM_TYPE_LABEL: Record<ItemType, string> = {
  [ItemType.SHIRT]: "Shirt",
  [ItemType.HOODIE]: "Hoodie",
  [ItemType.JACKET]: "Jacket",
  [ItemType.PANTS]: "Pants",
  [ItemType.SHORTS]: "Shorts",
  [ItemType.JEANS]: "Jeans",
  [ItemType.COAT]: "Coat",
  [ItemType.SHOES]: "Shoes",
  [ItemType.ACCESSORY]: "Accessory",
};

// Each type belongs to one broad category, which outfits, the stylist and the canvas use.
export const TYPE_CATEGORY: Record<ItemType, Category> = {
  [ItemType.SHIRT]: Category.TOPS,
  [ItemType.HOODIE]: Category.TOPS,
  [ItemType.JACKET]: Category.OUTERWEAR,
  [ItemType.COAT]: Category.OUTERWEAR,
  [ItemType.PANTS]: Category.BOTTOMS,
  [ItemType.SHORTS]: Category.BOTTOMS,
  [ItemType.JEANS]: Category.BOTTOMS,
  [ItemType.SHOES]: Category.SHOES,
  [ItemType.ACCESSORY]: Category.ACCESSORIES,
};

// The picture to show for an item: framed (uniform size per type) when available,
// otherwise the background-removed cutout, otherwise the original photo.
export function itemImageUrl(item: {
  framedUrl?: string | null;
  bgRemovedUrl: string | null;
  imageUrl: string;
}) {
  return item.framedUrl ?? item.bgRemovedUrl ?? item.imageUrl;
}

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
