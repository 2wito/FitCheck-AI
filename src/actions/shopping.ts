"use server";

import { z } from "zod";

import { Category } from "@/generated/prisma/browser";
import { getCurrentUserId } from "@/lib/auth";
import { ImageSearchNotConfiguredError, searchProductImages } from "@/lib/image-search";
import type { ActionResult, ImageSearchResult } from "@/types";

const CATEGORY_NOUNS: Record<Category, string> = {
  [Category.TOPS]: "top",
  [Category.BOTTOMS]: "pants",
  [Category.SHOES]: "shoes",
  [Category.OUTERWEAR]: "jacket",
  [Category.ACCESSORIES]: "accessory",
};

const inputSchema = z.object({
  category: z.enum(Category),
  // Colors already in the outfit, so suggestions go with them.
  colors: z.array(z.string().trim().max(40)).max(6),
  style: z.string().trim().max(40).nullable(),
});

export type ShoppingSuggestions = {
  query: string;
  results: ImageSearchResult[];
  // Google Shopping search for the same query, for browsing beyond the top picks.
  searchUrl: string;
};

// "Complete the look": items to buy for a category missing from the user's closet.
export async function findItemsToBuy(
  input: z.infer<typeof inputSchema>,
): Promise<ActionResult<ShoppingSuggestions>> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid request" };
  if (!(await getCurrentUserId())) return { success: false, error: "You must be signed in" };

  const { category, colors, style } = parsed.data;
  // Lead with the outfit's main color: e.g. "streetwear black shoes".
  const query = [style, colors.find(Boolean), CATEGORY_NOUNS[category]].filter(Boolean).join(" ");

  try {
    // "buy online" and excluding inspiration sites steers image results toward product pages
    // (phrasings like "...to match my outfit" mostly return Pinterest outfit posts).
    const found = await searchProductImages(
      `${query} buy online -site:pinterest.com -site:instagram.com`,
      10,
    );
    const shoppable = found.filter(
      (r) => !/(pinterest|instagram|tiktok)\./i.test(new URL(r.link ?? r.imageUrl).hostname),
    );
    // Prefer results that link to a product page; fall back to any image result.
    const results = [...shoppable.filter((r) => r.link), ...shoppable.filter((r) => !r.link)].slice(
      0,
      3,
    );
    return {
      success: true,
      data: {
        query,
        results,
        searchUrl: `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}`,
      },
    };
  } catch (error) {
    if (error instanceof ImageSearchNotConfiguredError) {
      return { success: false, error: "Online search isn't set up (missing SERPER_API_KEY)." };
    }
    console.error("Shopping search failed", error);
    return { success: false, error: "Couldn't load suggestions right now. Please try again." };
  }
}
