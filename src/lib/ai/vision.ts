import "server-only";

import { generateText, Output } from "ai";

import { withModelFallback } from "@/lib/ai/model";
import { clothingTagsSchema, type ClothingTags } from "@/lib/validations/clothing";

const INSTRUCTIONS = `You are a fashion stylist cataloguing a user's wardrobe.
Look at the single clothing item or accessory in the photo and describe it.
Ignore the background, hangers, mannequins and any person wearing the item.
If several items are visible, describe the most prominent one.`;

export async function analyzeClothing(
  image: Uint8Array,
  mediaType: string,
): Promise<ClothingTags> {
  const { output } = await withModelFallback((model, abortSignal) =>
    generateText({
      model,
      abortSignal,
      maxRetries: 1,
      output: Output.object({ schema: clothingTagsSchema }),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: INSTRUCTIONS },
            { type: "file", mediaType, data: image },
          ],
        },
      ],
    }),
  );

  return output;
}
