import "server-only";

import { z } from "zod";

import type { ImageSearchResult } from "@/types";

// Google Images results via Serper.dev (2,500 free queries, no card required). Google's
// own Custom Search JSON API is closed to new customers and shuts down on 2027-01-01.
// To switch provider (e.g. SerpAPI), replace this function; callers only use its result.

export class ImageSearchNotConfiguredError extends Error {}

// Parsed leniently: only imageUrl is required, so provider-side field additions don't break us.
const serperResponseSchema = z.object({
  images: z
    .array(
      z.object({
        imageUrl: z.string(),
        thumbnailUrl: z.string().optional(),
        title: z.string().optional(),
        source: z.string().optional(),
        domain: z.string().optional(),
        link: z.string().optional(),
      }),
    )
    .default([]),
});

function parseHttpUrl(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

export async function searchProductImages(query: string, limit = 24): Promise<ImageSearchResult[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) throw new ImageSearchNotConfiguredError("SERPER_API_KEY is not set");

  const response = await fetch("https://google.serper.dev/images", {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, num: limit }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Image search failed (${response.status})`);

  const { images } = serperResponseSchema.parse(await response.json());

  return images.slice(0, limit).flatMap((image) => {
    const imageUrl = parseHttpUrl(image.imageUrl);
    if (!imageUrl) return [];
    // Thumbnails are shown in the browser, so they must be https to avoid mixed content.
    const thumbnail = parseHttpUrl(image.thumbnailUrl);
    return [
      {
        imageUrl: imageUrl.href,
        thumbnailUrl: thumbnail?.protocol === "https:" ? thumbnail.href : imageUrl.href,
        title: image.title ?? "",
        source: image.source ?? image.domain ?? imageUrl.hostname,
        link: parseHttpUrl(image.link)?.href ?? null,
      },
    ];
  });
}
