import "server-only";

import { google } from "@ai-sdk/google";
import { APICallError, RetryError, type LanguageModel } from "ai";

// Any AI SDK model works here, e.g. openai("gpt-...") from @ai-sdk/openai; vision features
// need a vision-capable model. The fallback is used when the primary is overloaded.
const PRIMARY_MODEL = process.env.GEMINI_MODEL ?? "gemini-flash-latest";
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL ?? "gemini-flash-lite-latest";
const MODELS = [...new Set([PRIMARY_MODEL, FALLBACK_MODEL])].map((id) => ({ id, model: google(id) }));

// Per attempt, including the SDK's own retries. Keeps a slow model from running past the
// serverless function limit (300s on Vercel) with the user staring at a spinner.
const ATTEMPT_TIMEOUT_MS = 60_000;

export function assertAiConfigured() {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");
  }
}

// Overloaded (503), rate-limited (429), server errors and timeouts are worth retrying on
// another model. Anything else (bad request, invalid output) would fail the same way.
function isTransient(error: unknown) {
  const cause = RetryError.isInstance(error) ? error.lastError : error;
  if (APICallError.isInstance(cause)) {
    return [429, 500, 502, 503, 504].includes(cause.statusCode ?? 0);
  }
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

// Runs an AI call on the primary model, falling back to the next one when Gemini's shared
// capacity is temporarily unavailable ("This model is currently experiencing high demand").
export async function withModelFallback<T>(
  call: (model: LanguageModel, abortSignal: AbortSignal) => Promise<T>,
): Promise<T> {
  assertAiConfigured();

  let lastError: unknown;
  for (const { id, model } of MODELS) {
    try {
      return await call(model, AbortSignal.timeout(ATTEMPT_TIMEOUT_MS));
    } catch (error) {
      if (!isTransient(error)) throw error;
      lastError = error;
      console.warn(`AI model ${id} unavailable, trying fallback:`, error instanceof Error ? error.message : error);
    }
  }
  throw lastError;
}
