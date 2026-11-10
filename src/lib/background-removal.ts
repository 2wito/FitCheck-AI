// Browser-side background removal (@imgly/background-removal: ONNX model on WebAssembly/WebGPU).
// Runs on the user's device, so the server needs no native ML binaries; those failed on
// Vercel ("libonnxruntime.so: cannot open shared object file") and bloated every function.
//
// Devices with WebGPU run the model on the GPU (several times faster than WASM on the CPU);
// everything else, or a GPU run that fails, uses the CPU path. Models and runtime are fetched
// from IMG.LY's CDN on first use and cached by the browser. Call preloadBackgroundRemoval()
// when the user starts adding an item so the download overlaps with picking a photo.
//
// Note: @imgly/background-removal is AGPL-3.0, like the server package it replaces.

import type { Config } from "@imgly/background-removal";

// Lightweight transparent cutouts. Browsers that can't encode WebP fall back to PNG.
const OUTPUT: Config["output"] = { format: "image/webp", quality: 0.85 };

// CPU: smallest model (~44 MB), ~4× lighter than the full one, near-identical for clothing.
const CPU_CONFIG: Config = { model: "isnet_quint8", device: "cpu", output: OUTPUT };
// GPU: fp16 is the variant WebGPU runs fast (~88 MB); quantized int8 gains nothing there.
const GPU_CONFIG: Config = {
  model: "isnet_fp16",
  device: "gpu",
  output: OUTPUT,
};

// Loaded on demand so the library never weighs on the initial page bundle.
let library: Promise<typeof import("@imgly/background-removal")> | null = null;
const load = () => (library ??= import("@imgly/background-removal"));

// Set once a GPU run fails, so later photos go straight to the CPU path.
let gpuBroken = false;
let gpuAvailable: Promise<boolean> | null = null;
const hasWebGpu = () =>
  (gpuAvailable ??= (async () => {
    try {
      const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
      return Boolean(gpu && (await gpu.requestAdapter()));
    } catch {
      return false;
    }
  })());

async function pickConfig(): Promise<Config> {
  return !gpuBroken && (await hasWebGpu()) ? GPU_CONFIG : CPU_CONFIG;
}

let warmed: Promise<void> | null = null;

export function preloadBackgroundRemoval() {
  warmed ??= Promise.all([load(), pickConfig()])
    .then(([{ preload }, config]) => preload(config))
    .catch((error) => {
      warmed = null; // allow a retry later
      console.warn("Background removal preload failed", error);
    });
}

// Returns the cutout as a file ready for upload (WebP, or PNG where WebP encoding isn't supported).
export async function removeBackgroundInBrowser(image: Blob): Promise<File> {
  const { removeBackground } = await load();
  const config = await pickConfig();
  let blob: Blob;
  try {
    blob = await removeBackground(image, config);
  } catch (error) {
    if (config.device !== "gpu") throw error;
    console.warn("GPU background removal failed; falling back to CPU", error);
    gpuBroken = true;
    blob = await removeBackground(image, CPU_CONFIG);
  }
  const extension = blob.type === "image/webp" ? "webp" : "png";
  return new File([blob], `cutout.${extension}`, { type: blob.type || "image/png" });
}
