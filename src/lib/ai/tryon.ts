import "server-only";

import { google } from "@ai-sdk/google";
import { APICallError, generateImage, NoImageGeneratedError, RetryError } from "ai";
import sharp from "sharp";

import { CATEGORY_LABELS } from "@/lib/clothing";
import { assertAiConfigured } from "@/lib/ai/model";
import type { ClothingItem } from "@/types";

// Gemini image model ("Nano Banana"): edits the body photo using the garment photos as
// references, so a whole outfit is applied in one call. Override with GEMINI_IMAGE_MODEL.
const tryOnModel = google.image(process.env.GEMINI_IMAGE_MODEL ?? "gemini-nano-banana-2.1");

export type TryOnGarment = Pick<ClothingItem, "name" | "category" | "imageUrl" | "bgRemovedUrl">;

export type TryOnImage = { data: Uint8Array; mediaType: string };

// Thrown when the model returns no image (e.g. the photo was blocked by safety filters).
export class TryOnUnavailableError extends Error {}

// Thrown when the API key has no image-generation quota. Gemini's free tier doesn't
// include image models, so this means billing needs to be enabled on the key.
export class TryOnQuotaError extends Error {}

function isQuotaError(error: unknown): boolean {
  const cause = RetryError.isInstance(error) ? error.lastError : error;
  return APICallError.isInstance(cause) && cause.statusCode === 429;
}

const ASPECT_RATIOS = ["9:16", "2:3", "3:4", "4:5", "1:1", "5:4", "4:3", "3:2", "16:9"] as const;

// Matches the output's shape to the body photo, so the person isn't cropped or stretched.
async function closestAspectRatio(image: Uint8Array) {
  const { width = 3, height = 4 } = await sharp(image).metadata();
  const target = width / height;
  return ASPECT_RATIOS.reduce((best, ratio) => {
    const [w, h] = ratio.split(":").map(Number);
    const [bw, bh] = best.split(":").map(Number);
    return Math.abs(w / h - target) < Math.abs(bw / bh - target) ? ratio : best;
  });
}

async function fetchImage(url: string): Promise<Uint8Array> {
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`Failed to fetch garment image (${response.status})`);
  return new Uint8Array(await response.arrayBuffer());
}

function buildPrompt(garments: TryOnGarment[]) {
  const list = garments
    .map((g, i) => `${i + 1}. ${CATEGORY_LABELS[g.category]}: "${g.name}"`)
    .join("\n");

  return `Virtual try-on. The FIRST image is a photo of a person. The following images are
clothing items, in this order:
${list}

Generate a photorealistic photo of the SAME person wearing ALL of these items together,
replacing whatever they currently wear in those categories.

Requirements:
- Keep the person exactly as they are: face, identity, skin tone, hair, body shape and pose.
- Keep the original background, framing, camera angle and lighting.
- Reproduce every garment faithfully: color, pattern, prints and graphics, texture, cut and length.
- Make the fit natural, with realistic folds, drape and shadows consistent with the photo's lighting.
- Wear accessories naturally (a bag on the shoulder or in hand, a hat on the head, and so on).
- Return only the edited photo.`;
}

export async function generateTryOnImage({
  bodyPhoto,
  garments,
}: {
  bodyPhoto: Uint8Array;
  garments: TryOnGarment[];
}): Promise<TryOnImage> {
  assertAiConfigured();

  const [aspectRatio, ...garmentImages] = await Promise.all([
    closestAspectRatio(bodyPhoto),
    // Cutouts (transparent background) are clearer references than the original photos.
    ...garments.map((g) => fetchImage(g.bgRemovedUrl ?? g.imageUrl)),
  ]);

  const { images } = await generateImage({
    model: tryOnModel,
    prompt: { text: buildPrompt(garments), images: [bodyPhoto, ...garmentImages] },
    aspectRatio,
    maxRetries: 1,
  }).catch((error: unknown) => {
    if (NoImageGeneratedError.isInstance(error)) {
      throw new TryOnUnavailableError(error.message);
    }
    if (isQuotaError(error)) throw new TryOnQuotaError("Image generation quota exceeded");
    throw error;
  });

  const image = images[0];
  if (!image) throw new TryOnUnavailableError("No image returned");
  return { data: image.uint8Array, mediaType: image.mediaType };
}
