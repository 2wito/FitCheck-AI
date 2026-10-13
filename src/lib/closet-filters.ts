// Quick-filter pills for the closet. Purely client-side predicates over item metadata,
// so switching filters is instant and never reloads the page.

import { Category, Season } from "@/generated/prisma/browser";
import type { ClothingItem } from "@/types";

type FilterableItem = Pick<
  ClothingItem,
  "category" | "season" | "style" | "color" | "secondaryColor"
>;

export type QuickFilter = {
  id: string;
  label: string;
  matches: (item: FilterableItem) => boolean;
};

const hasColor = (item: FilterableItem, pattern: RegExp) =>
  [item.color, item.secondaryColor].some((color) => color && pattern.test(color));

const CASUAL_STYLES = new Set(["casual", "smart casual", "streetwear", "loungewear"]);
const EVENING_STYLES = new Set(["formal", "party"]);

export const QUICK_FILTERS: QuickFilter[] = [
  { id: "all", label: "All", matches: () => true },
  { id: "tops", label: "Tops", matches: (i) => i.category === Category.TOPS },
  { id: "bottoms", label: "Bottoms", matches: (i) => i.category === Category.BOTTOMS },
  { id: "shoes", label: "Shoes", matches: (i) => i.category === Category.SHOES },
  { id: "casual", label: "Casual", matches: (i) => CASUAL_STYLES.has(i.style ?? "") },
  { id: "evening", label: "Evening", matches: (i) => EVENING_STYLES.has(i.style ?? "") },
  { id: "winter", label: "Winter", matches: (i) => i.season === Season.WINTER },
  { id: "summer", label: "Summer", matches: (i) => i.season === Season.SUMMER },
  // \b also matches "off-white", "jet black" and similar AI color names.
  { id: "black", label: "Black", matches: (i) => hasColor(i, /\bblack\b/i) },
  { id: "white", label: "White", matches: (i) => hasColor(i, /\bwhite\b/i) },
];
