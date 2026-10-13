import "server-only";

import { generateText, Output } from "ai";
import { z } from "zod";

import { Category, type Season } from "@/generated/prisma/browser";
import { withModelFallback } from "@/lib/ai/model";
import { SEASON_LABELS, type Occasion } from "@/lib/clothing";
import type { ClothingItem, StylistSuggestion } from "@/types";

export type StylistItem = Pick<
  ClothingItem,
  "id" | "name" | "category" | "color" | "secondaryColor" | "season" | "style"
>;

// How many items of each category one outfit may contain. Enforced after generation,
// since a model can still over-pick even when the prompt says not to.
const CATEGORY_LIMITS: Record<Category, number> = {
  [Category.TOPS]: 1,
  [Category.BOTTOMS]: 1,
  [Category.SHOES]: 1,
  [Category.OUTERWEAR]: 1,
  [Category.ACCESSORIES]: 2,
};

const INSTRUCTIONS = `You are an expert personal stylist. Build ONE complete, wearable outfit
using only items from the user's closet listed below.

Rules:
- A complete outfit has one top, one bottom and one pair of shoes, whenever the closet has them.
- Add outerwear only when the season or occasion calls for it. Add at most two accessories, only if they elevate the look.
- Match the occasion: the items' styles should suit it and work together.
- Respect the season: ALL_WEATHER items suit any season; avoid heavy pieces in summer and light-only looks in winter.
- Use color harmony: build around neutrals with at most one or two accent colors, pair complementary or analogous tones, and avoid clashing colors.
- Never pick two items that do the same job (e.g. two pairs of shoes).

Return the refs of the items you chose, a short catchy outfit name, and one or two
sentences explaining why the pieces work together.`;

export async function generateOutfit({
  items,
  occasion,
  season,
}: {
  items: StylistItem[];
  occasion: Occasion;
  season: Season | null;
}): Promise<StylistSuggestion> {
  // Short refs instead of UUIDs: fewer tokens, and the enum makes it impossible for the
  // model to return an item that isn't in the closet.
  const refs = items.map((_, index) => `item${index + 1}`);
  const byRef = new Map(refs.map((ref, index) => [ref, items[index]]));

  const closet = items
    .map((item, index) => {
      const colors = [item.color, item.secondaryColor].filter(Boolean).join(" + ") || "unknown";
      return `${refs[index]} | ${item.category} | "${item.name}" | colors: ${colors} | season: ${item.season} | style: ${item.style ?? "unspecified"}`;
    })
    .join("\n");

  const request = `Occasion: ${occasion}
Season: ${season ? SEASON_LABELS[season] : "any (not specified)"}

Closet:
${closet}`;

  const { output } = await withModelFallback((model, abortSignal) =>
    generateText({
      model,
      abortSignal,
      maxRetries: 1,
      instructions: INSTRUCTIONS,
      output: Output.object({
        schema: z.object({
          itemRefs: z.array(z.enum(refs as [string, ...string[]])).min(1).max(7),
          name: z.string().describe("Short catchy outfit name, max 5 words"),
          reasoning: z.string().describe("One or two sentences on why the pieces work together"),
        }),
      }),
      prompt: request,
    }),
  );

  const counts = new Map<Category, number>();
  const itemIds: string[] = [];
  for (const ref of new Set(output.itemRefs)) {
    const item = byRef.get(ref)!;
    const count = counts.get(item.category) ?? 0;
    if (count >= CATEGORY_LIMITS[item.category]) continue;
    counts.set(item.category, count + 1);
    itemIds.push(item.id);
  }

  return { itemIds, name: output.name.trim(), reasoning: output.reasoning.trim() };
}
