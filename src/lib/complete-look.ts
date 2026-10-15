// "Complete the look": closet-based suggestions for an incomplete or low-scoring outfit.
// Ranks candidates with the same rule-based estimator as the match-score fallback, so it's
// instant and free (no AI call).

import { Category } from "@/generated/prisma/browser";
import { estimateMatch } from "@/lib/match-score";
import type { ClothingItem } from "@/types";

const CORE = [Category.TOPS, Category.BOTTOMS, Category.SHOES] as const;
const SWAPPABLE = new Set<Category>([...CORE, Category.OUTERWEAR]);

export type AddSuggestion = { item: ClothingItem; score: number };
export type SwapSuggestion = { item: ClothingItem; replaces: ClothingItem; gain: number };

export type LookCompletion = {
  // Core categories (top, bottom, shoes) the outfit doesn't have yet.
  missing: Category[];
  additions: AddSuggestion[];
  swaps: SwapSuggestion[];
  // Missing categories the user owns nothing in: candidates for shopping suggestions.
  notInCloset: Category[];
};

export function completeTheLook(outfit: ClothingItem[], closet: ClothingItem[]): LookCompletion {
  const onCanvas = new Set(outfit.map((item) => item.id));
  const available = closet.filter((item) => !onCanvas.has(item.id));
  const present = new Set(outfit.map((item) => item.category));
  const missing = CORE.filter((category) => !present.has(category));

  // Best two closet pieces for each missing category.
  const additions = missing.flatMap((category) =>
    available
      .filter((item) => item.category === category)
      .map((item) => ({ item, score: estimateMatch([...outfit, item]).score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 2),
  );

  // For each swappable piece, the alternative that improves the score most (if any).
  const base = estimateMatch(outfit).score;
  const swaps = outfit
    .filter((item) => SWAPPABLE.has(item.category))
    .flatMap((current) => {
      const best = available
        .filter((item) => item.category === current.category)
        .map((item) => ({
          item,
          replaces: current,
          gain: estimateMatch(outfit.map((o) => (o.id === current.id ? item : o))).score - base,
        }))
        .sort((a, b) => b.gain - a.gain)[0];
      return best && best.gain >= 5 ? [best] : [];
    })
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 3);

  const notInCloset = missing.filter(
    (category) => !closet.some((item) => item.category === category),
  );

  return { missing, additions, swaps, notInCloset };
}
