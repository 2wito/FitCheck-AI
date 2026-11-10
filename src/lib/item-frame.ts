// Uniform item pictures: every item is placed on the same fixed canvas, inside a guide
// frame that depends on its type, so all jeans (or shirts, or shoes) show at the same size
// and different types keep believable proportions next to each other.
// Browser-only (canvas). Used on upload (auto-fit) and by the photo editor (manual fit).

import { ItemType } from "@/generated/prisma/browser";

export const FRAME_WIDTH = 800;
export const FRAME_HEIGHT = 1000;

// Guide frame per type, as fractions of the canvas (centered). The garment is scaled to
// touch the frame on one axis and fit inside on the other.
const GUIDES: Record<ItemType, { w: number; h: number }> = {
  [ItemType.SHIRT]: { w: 0.78, h: 0.62 },
  [ItemType.HOODIE]: { w: 0.84, h: 0.68 },
  [ItemType.JACKET]: { w: 0.84, h: 0.72 },
  [ItemType.COAT]: { w: 0.74, h: 0.9 },
  [ItemType.PANTS]: { w: 0.52, h: 0.9 },
  [ItemType.JEANS]: { w: 0.52, h: 0.9 },
  [ItemType.SHORTS]: { w: 0.64, h: 0.5 },
  [ItemType.SHOES]: { w: 0.84, h: 0.42 },
  [ItemType.ACCESSORY]: { w: 0.56, h: 0.56 },
};

export type Rect = { x: number; y: number; w: number; h: number };

// Image top-left corner in canvas pixels, and image-pixel → canvas-pixel scale.
export type Placement = { x: number; y: number; scale: number };

export function guideFor(type: ItemType): Rect {
  const { w, h } = GUIDES[type];
  return {
    x: ((1 - w) / 2) * FRAME_WIDTH,
    y: ((1 - h) / 2) * FRAME_HEIGHT,
    w: w * FRAME_WIDTH,
    h: h * FRAME_HEIGHT,
  };
}

// keepUrl: leave image.src (an object URL) valid so it can also be shown in an <img>;
// the caller then revokes it with URL.revokeObjectURL when done.
export async function loadImage(source: Blob, keepUrl = false): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(source);
  const image = new Image();
  image.src = url;
  try {
    await image.decode();
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
  // Once decoded, drawing to a canvas still works after revoking.
  if (!keepUrl) URL.revokeObjectURL(url);
  return image;
}

// Downloads a stored picture as a Blob (Supabase Storage allows cross-origin reads), so
// drawing it never taints the canvas. Its object URL stays valid for display: revoke
// image.src when done.
export async function fetchImage(url: string): Promise<HTMLImageElement> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Couldn't load image (${response.status})`);
  return loadImage(await response.blob(), true);
}

// Bounding box of the visible (non-transparent) pixels, in image pixels. Measured on a
// downscaled copy for speed. A photo without transparency simply returns its full size.
export function contentBounds(image: HTMLImageElement): Rect {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const sample = Math.min(1, 400 / Math.max(width, height));
  const w = Math.max(1, Math.round(width * sample));
  const h = Math.max(1, Math.round(height * sample));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const context = canvas.getContext("2d", { willReadFrequently: true })!;
  context.drawImage(image, 0, 0, w, h);
  const { data } = context.getImageData(0, 0, w, h);

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 24) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return { x: 0, y: 0, w: width, h: height };
  return {
    x: minX / sample,
    y: minY / sample,
    w: (maxX - minX + 1) / sample,
    h: (maxY - minY + 1) / sample,
  };
}

// Fits the visible garment inside its type's guide frame, centered.
export function autoPlacement(image: HTMLImageElement, type: ItemType): Placement {
  const bounds = contentBounds(image);
  const guide = guideFor(type);
  const scale = Math.min(guide.w / bounds.w, guide.h / bounds.h);
  return {
    scale,
    x: guide.x + (guide.w - bounds.w * scale) / 2 - bounds.x * scale,
    y: guide.y + (guide.h - bounds.h * scale) / 2 - bounds.y * scale,
  };
}

// Renders the framed picture: transparent canvas, garment at the given placement.
// WebP keeps it light (well under 100 KB); browsers that can't encode WebP return PNG.
export async function renderFramed(image: HTMLImageElement, placement: Placement): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = FRAME_WIDTH;
  canvas.height = FRAME_HEIGHT;
  const context = canvas.getContext("2d")!;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    placement.x,
    placement.y,
    image.naturalWidth * placement.scale,
    image.naturalHeight * placement.scale,
  );
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Image encoding failed"))),
      "image/webp",
      0.85,
    ),
  );
  const extension = blob.type === "image/webp" ? "webp" : "png";
  return new File([blob], `framed.${extension}`, { type: blob.type || "image/png" });
}

// One step for uploads: auto-fit a cutout into its type's frame.
export async function frameCutout(cutout: Blob, type: ItemType): Promise<File> {
  const image = await loadImage(cutout);
  return renderFramed(image, autoPlacement(image, type));
}
