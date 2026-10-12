import "server-only";

import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";

import { clothingTagsSchema, type ClothingTags } from "@/lib/validations/clothing";

// Any vision-capable AI SDK model works here, e.g. openai("gpt-...") from @ai-sdk/openai.
const model = google(process.env.GEMINI_MODEL ?? "gemini-flash-latest");

const INSTRUCTIONS = `You are a fashion stylist cataloguing a user's wardrobe.
Look at the single clothing item or accessory in the photo and describe it.
Ignore the background, hangers, mannequins and any person wearing the item.
If several items are visible, describe the most prominent one.`;

export async function analyzeClothing(
  image: Uint8Array,
  mediaType: string,
): Promise<ClothingTags> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");
  }

  const { output } = await generateText({
    model,
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
  });

  return output;
}
