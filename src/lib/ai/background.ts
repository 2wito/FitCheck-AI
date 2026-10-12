import "server-only";

import { removeBackground as imglyRemoveBackground } from "@imgly/background-removal-node";

// Runs an ONNX segmentation model locally (no API key, ~2s per image on CPU).
// Note: @imgly/background-removal-node is AGPL-3.0. To swap in a hosted API (remove.bg,
// Clipdrop, Replicate), replace this function body; callers only depend on its signature.
export async function removeBackground(
  image: Uint8Array<ArrayBuffer>,
  mediaType: string,
): Promise<Buffer> {
  const blob = await imglyRemoveBackground(new Blob([image], { type: mediaType }), {
    model: "medium",
    output: { format: "image/png" },
  });
  return Buffer.from(await blob.arrayBuffer());
}
