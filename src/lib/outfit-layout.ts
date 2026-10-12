// Geometry and layering rules for the outfit canvas. Pure functions, shared by the
// interactive canvas, the AI stylist's auto-layout and the read-only outfit previews.
//
// Coordinate system: each item is a square box centred at (positionX, positionY), both
// fractions (0–1) of the canvas width/height. Box side = BASE_ITEM_WIDTH × scale × canvas
// width. Everything is relative, so an outfit looks the same at any rendered size.

import type { CSSProperties } from "react";

import { Category } from "@/generated/prisma/browser";
import type { CanvasItem } from "@/types";

export const BASE_ITEM_WIDTH = 0.4;
export const MIN_SCALE = 0.2;
export const MAX_SCALE = 3;

type Slot = Pick<CanvasItem, "positionX" | "positionY" | "scale">;

// A flat-lay arrangement: top above bottoms above shoes, accessories in the side columns.
const SLOTS: Record<Category, Slot> = {
  [Category.TOPS]: { positionX: 0.5, positionY: 0.2, scale: 1.1 },
  [Category.OUTERWEAR]: { positionX: 0.66, positionY: 0.21, scale: 0.95 },
  [Category.BOTTOMS]: { positionX: 0.5, positionY: 0.55, scale: 1.2 },
  [Category.SHOES]: { positionX: 0.5, positionY: 0.87, scale: 0.6 },
  [Category.ACCESSORIES]: { positionX: 0.86, positionY: 0.5, scale: 0.45 },
};

const ACCESSORY_SLOTS = [
  { positionX: 0.86, positionY: 0.5 },
  { positionX: 0.14, positionY: 0.5 },
  { positionX: 0.86, positionY: 0.72 },
  { positionX: 0.14, positionY: 0.72 },
];

// Higher layers sit on top: a jacket overlaps the shirt it's paired with.
const LAYER: Record<Category, number> = {
  [Category.BOTTOMS]: 0,
  [Category.SHOES]: 1,
  [Category.TOPS]: 2,
  [Category.OUTERWEAR]: 3,
  [Category.ACCESSORIES]: 4,
};

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const clampScale = (scale: number) => clamp(scale, MIN_SCALE, MAX_SCALE);

export function defaultScale(category: Category) {
  return SLOTS[category].scale;
}

// Where a newly added item goes, given the categories already on the canvas.
// `withOuterwear` shifts the top aside to make room for a jacket beside it.
export function slotFor(
  category: Category,
  existing: Category[],
  withOuterwear = existing.includes(Category.OUTERWEAR),
): Slot {
  const sameCategory = existing.filter((c) => c === category).length;

  if (category === Category.ACCESSORIES) {
    const position = ACCESSORY_SLOTS[sameCategory % ACCESSORY_SLOTS.length];
    return { ...position, scale: SLOTS[category].scale };
  }

  const slot =
    category === Category.TOPS && withOuterwear
      ? { ...SLOTS[category], positionX: 0.36, scale: 0.95 }
      : SLOTS[category];

  // Duplicates of a category cascade diagonally so they don't hide each other.
  const offset = sameCategory * 0.06;
  return {
    positionX: clamp(slot.positionX + offset, 0, 1),
    positionY: clamp(slot.positionY + offset, 0, 1),
    scale: slot.scale,
  };
}

// Lays out a full set of items from scratch (used for AI outfits and "Auto-arrange").
export function autoLayout(items: { id: string; category: Category }[]): CanvasItem[] {
  const withOuterwear = items.some((item) => item.category === Category.OUTERWEAR);
  const placed: Category[] = [];

  return [...items]
    .sort((a, b) => LAYER[a.category] - LAYER[b.category])
    .map((item, index) => {
      const slot = slotFor(item.category, placed, withOuterwear);
      placed.push(item.category);
      return { clothingItemId: item.id, ...slot, zIndex: index };
    });
}

export function topZIndex(items: CanvasItem[]) {
  return items.reduce((max, item) => Math.max(max, item.zIndex), -1);
}

// Re-numbers z-indexes to 0..n-1, keeping their order, so values never drift upward.
export function normalizeLayers(items: CanvasItem[]): CanvasItem[] {
  const order = [...items].sort((a, b) => a.zIndex - b.zIndex).map((i) => i.clothingItemId);
  return items.map((item) => ({ ...item, zIndex: order.indexOf(item.clothingItemId) }));
}

// Swaps an item with its neighbour one layer up (direction 1) or down (direction -1).
export function moveLayer(items: CanvasItem[], id: string, direction: 1 | -1): CanvasItem[] {
  const normalized = normalizeLayers(items);
  const current = normalized.find((item) => item.clothingItemId === id);
  if (!current) return items;

  const target = current.zIndex + direction;
  if (target < 0 || target >= normalized.length) return normalized;

  return normalized.map((item) => {
    if (item.clothingItemId === id) return { ...item, zIndex: target };
    if (item.zIndex === target) return { ...item, zIndex: current.zIndex };
    return item;
  });
}

// Absolute-positioning styles for one item, as percentages of the canvas.
export function itemBoxStyle(item: CanvasItem | Omit<CanvasItem, "clothingItemId">): CSSProperties {
  return {
    left: `${item.positionX * 100}%`,
    top: `${item.positionY * 100}%`,
    width: `${BASE_ITEM_WIDTH * item.scale * 100}%`,
    aspectRatio: "1",
    zIndex: item.zIndex,
    transform: "translate(-50%, -50%)",
  };
}
