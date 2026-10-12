import "server-only";

import { google } from "@ai-sdk/google";

// Shared model for all AI features. Any AI SDK model works here, e.g. openai("gpt-...")
// from @ai-sdk/openai; vision features need a vision-capable model.
export const model = google(process.env.GEMINI_MODEL ?? "gemini-flash-latest");

export function assertAiConfigured() {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");
  }
}
