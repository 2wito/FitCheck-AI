// Rule-based color & style match estimate. Used when Gemini is unavailable (quota/overload),
// so the canvas always shows a score. Weights: completeness 30, color 30, style 25, season 15.

import { Category, Season } from "@/generated/prisma/browser";
import type { ClothingItem } from "@/types";

export type ScorableItem = Pick<
  ClothingItem,
  "category" | "color" | "secondaryColor" | "season" | "style"
>;

const NEUTRALS =
  /\b(black|white|gr[ae]y|charcoal|navy|beige|cream|ivory|tan|camel|khaki|brown|taupe|stone|denim|off-white|nude)\b/i;

export function estimateMatch(items: ScorableItem[]): { score: number; summary: string } {
  const categories = new Set(items.map((i) => i.category));
  const core = [Category.TOPS, Category.BOTTOMS, Category.SHOES].filter((c) => categories.has(c));
  const completeness = core.length * 10;

  const accents = [
    ...new Set(
      items
        // Blue bottoms are almost always denim, which styles like a neutral.
        .filter((i) => !(i.category === Category.BOTTOMS && /\bblue\b/i.test(i.color ?? "")))
        .map((i) => i.color?.toLowerCase().trim())
        .filter((c): c is string => !!c && !NEUTRALS.test(c)),
    ),
  ];
  const color = accents.length <= 1 ? 30 : accents.length === 2 ? 22 : 10;

  const styles = new Set(items.map((i) => i.style).filter(Boolean));
  const style = styles.size <= 1 ? 25 : styles.size === 2 ? 18 : 8;

  const seasons = new Set(items.map((i) => i.season));
  const seasonClash = seasons.has(Season.SUMMER) && seasons.has(Season.WINTER);
  const season = seasonClash ? 0 : 15;

  // Two pieces doing the same job (e.g. jeans and shorts) can't both be worn.
  const doubled = [Category.TOPS, Category.BOTTOMS, Category.SHOES].filter(
    (c) => items.filter((i) => i.category === c).length > 1,
  );
  const penalty = doubled.length * 15;

  const score = Math.max(35, Math.min(97, completeness + color + style + season - penalty));

  const colorNote =
    accents.length === 0
      ? "An all-neutral palette keeps the look clean and cohesive"
      : accents.length === 1
        ? `Neutrals let the ${accents[0]} accent stand out`
        : `${accents.length} accent colors compete a little for attention`;
  const styleNote =
    styles.size <= 1
      ? `, and the pieces share one ${[...styles][0] ?? "consistent"} style`
      : styles.size === 2
        ? `, while mixing ${[...styles].join(" and ")} styles adds contrast`
        : `, but ${styles.size} different styles (${[...styles].join(", ")}) pull in different directions`;
  const extra = doubled.length
    ? ` Pick one of the ${doubled.map((c) => c.toLowerCase()).join(" and ")}: they can't be worn together.`
    : seasonClash
      ? " Summer and winter pieces together may feel off-season."
      : core.length < 3
        ? ` Adding ${[Category.TOPS, Category.BOTTOMS, Category.SHOES]
            .filter((c) => !categories.has(c))
            .map((c) => c.toLowerCase())
            .join(" and ")} would complete it.`
        : "";

  return { score, summary: `${colorNote}${styleNote}.${extra}` };
}
