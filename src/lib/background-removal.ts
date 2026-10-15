// Browser-side background removal (@imgly/background-removal: ONNX model on WebAssembly).
// Runs on the user's device, so the server needs no native ML binaries; those failed on
// Vercel ("libonnxruntime.so: cannot open shared object file") and bloated every function.
//
// The model (~44 MB) and runtime (~12 MB) are fetched from IMG.LY's CDN on first use and
// cached by the browser. Call preloadBackgroundRemoval() when the user starts adding an item
// so the download overlaps with picking a photo.
//
// Note: @imgly/background-removal is AGPL-3.0, like the server package it replaces.

import type { Config } from "@imgly/background-removal";

const CONFIG: Config = {
  // Smallest model: ~4× lighter than the full one, visually near-identical for clothing.
  model: "isnet_quint8",
  device: "cpu",
  // Lightweight transparent cutouts. Browsers that can't encode WebP fall back to PNG.
  output: { format: "image/webp", quality: 0.85 },
};

// Loaded on demand so the library never weighs on the initial page bundle.
let library: Promise<typeof import("@imgly/background-removal")> | null = null;
const load = () => (library ??= import("@imgly/background-removal"));

let warmed: Promise<void> | null = null;

export function preloadBackgroundRemoval() {
  warmed ??= load()
    .then(({ preload }) => preload(CONFIG))
    .catch((error) => {
      warmed = null; // allow a retry later
      console.warn("Background removal preload failed", error);
    });
}

// Returns the cutout as a file ready for upload (WebP, or PNG where WebP encoding isn't supported).
export async function removeBackgroundInBrowser(image: Blob): Promise<File> {
  const { removeBackground } = await load();
  const blob = await removeBackground(image, CONFIG);
  const extension = blob.type === "image/webp" ? "webp" : "png";
  return new File([blob], `cutout.${extension}`, { type: blob.type || "image/png" });
}
