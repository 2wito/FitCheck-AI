// Browser-side image helpers.

const MAX_DIMENSION = 1280;

// Downscales large photos and bakes in EXIF rotation before upload. This keeps
// Server Action payloads small and makes AI analysis faster and cheaper.
export async function prepareImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // WebP keeps transparency and compresses well; browsers that can't encode it return PNG.
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Image encoding failed"))),
      "image/webp",
      0.85,
    ),
  );
  const extension = blob.type === "image/webp" ? "webp" : "png";
  const baseName = file.name.replace(/\.[^.]+$/, "") || "item";
  return new File([blob], `${baseName}.${extension}`, { type: blob.type });
}

export async function dataUrlToFile(dataUrl: string, name: string): Promise<File> {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], name, { type: blob.type });
}
