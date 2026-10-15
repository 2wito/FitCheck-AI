// Client-side PNG export of the outfit canvas. Draws the backdrop SVG and each item directly
// with the same geometry as the editor (no DOM screenshotting), so the image matches exactly.

import { svgDataUrl, type Backdrop } from "@/lib/backdrops";
import { BASE_ITEM_WIDTH } from "@/lib/outfit-layout";
import type { CanvasItem } from "@/types";

const WIDTH = 1080;
const HEIGHT = 1440;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    // Supabase Storage sends CORS headers, so cross-origin images don't taint the canvas.
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Couldn't load ${src}`));
    image.src = src;
  });
}

export async function renderOutfitImage({
  items,
  imageFor,
  backdrop,
}: {
  items: CanvasItem[];
  imageFor: (clothingItemId: string) => string;
  backdrop: Backdrop;
}): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d")!;

  // Transparent backdrop = no background at all (a real transparent PNG).
  if (backdrop.svg) {
    ctx.drawImage(await loadImage(svgDataUrl(backdrop.svg)), 0, 0, WIDTH, HEIGHT);
  }

  const ordered = [...items].sort((a, b) => a.zIndex - b.zIndex);
  const images = await Promise.all(ordered.map((item) => loadImage(imageFor(item.clothingItemId))));

  ordered.forEach((item, i) => {
    const image = images[i];
    // Square box centred on the item's position, image fitted inside ("object-contain").
    const box = BASE_ITEM_WIDTH * item.scale * WIDTH;
    const fit = Math.min(box / image.naturalWidth, box / image.naturalHeight);
    const width = image.naturalWidth * fit;
    const height = image.naturalHeight * fit;
    ctx.drawImage(
      image,
      item.positionX * WIDTH - width / 2,
      item.positionY * HEIGHT - height / 2,
      width,
      height,
    );
  });

  // Small brand mark, legible on light and dark backdrops.
  ctx.font = "600 28px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillStyle = backdrop.tone === "dark" ? "rgba(255,255,255,0.75)" : "rgba(24,24,27,0.6)";
  ctx.fillText("FitCheck AI", WIDTH - 32, HEIGHT - 28);

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Export failed"))),
      "image/png",
    ),
  );
}
