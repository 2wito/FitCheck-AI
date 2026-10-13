import "server-only";

import { generateText, Output } from "ai";
import { z } from "zod";

import { withModelFallback } from "@/lib/ai/model";
import { describeItem, type StylistItem } from "@/lib/ai/stylist";
import type { Occasion } from "@/lib/clothing";

const INSTRUCTIONS = `You are an expert personal stylist rating an outfit someone assembled.
Judge how well the pieces work together: color harmony (neutrals vs. accents, complementary
or clashing tones), textures and materials implied by the item names, style consistency,
season fit, and how complete the outfit is (top, bottom, shoes).

Give an honest score from 0 to 100 (90+ = excellent, 70-89 = good, 50-69 = needs work,
below 50 = clashing) and one or two concise sentences explaining the score. If something
clashes, say what and suggest one concrete fix.`;

export async function scoreOutfitWithAI(
  items: Omit<StylistItem, "id">[],
  occasion: Occasion | null,
): Promise<{ score: number; summary: string }> {
  const prompt = `${occasion ? `Occasion: ${occasion}\n` : ""}Outfit:
${items.map((item, i) => describeItem(item, `piece${i + 1}`)).join("\n")}`;

  const { output } = await withModelFallback((model, abortSignal) =>
    generateText({
      model,
      abortSignal,
      maxRetries: 1,
      instructions: INSTRUCTIONS,
      output: Output.object({
        schema: z.object({
          score: z.int().min(0).max(100),
          summary: z.string().describe("One or two sentences"),
        }),
      }),
      prompt,
    }),
    // The rule-based estimate is instant, so don't keep the user waiting on a busy model.
    { timeoutMs: 12_000 },
  );

  return { score: Math.round(output.score), summary: output.summary.trim() };
}
