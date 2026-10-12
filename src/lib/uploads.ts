import "server-only";

import { ACCEPTED_IMAGE_TYPES } from "@/lib/clothing";

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Reads and validates an uploaded image from a FormData field.
// Returns the file, or an error message suitable for showing to the user.
export function readImageFile(formData: FormData, field: string): File | string {
  const file = formData.get(field);
  if (!(file instanceof File) || file.size === 0) return "No image was uploaded";
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return "Use a JPEG, PNG or WebP image";
  if (file.size > MAX_IMAGE_BYTES) return "Image must be 8 MB or smaller";
  return file;
}
