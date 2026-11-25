// Browser-side: turns any photo the browser can decode into a small square WebP avatar.
const SIZE = 512;

export async function makeAvatar(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const side = Math.min(bitmap.width, bitmap.height);
  const left = (bitmap.width - side) / 2;
  const top = (bitmap.height - side) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  // Centered square crop.
  canvas.getContext("2d")!.drawImage(bitmap, left, top, side, side, 0, 0, SIZE, SIZE);
  bitmap.close();

  // Browsers that can't encode WebP (older Safari) return PNG.
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Image encoding failed"))),
      "image/webp",
      0.85,
    ),
  );
  const extension = blob.type === "image/webp" ? "webp" : "png";
  return new File([blob], `avatar.${extension}`, { type: blob.type });
}
