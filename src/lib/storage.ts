import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

// Public bucket for clothing photos. Paths are `<userId>/<itemId>/<file>`, and the ids are
// unguessable UUIDs. Body photos should go in a separate *private* bucket.
export const CLOSET_BUCKET = "closet";

export async function uploadImage(
  path: string,
  data: Blob,
  contentType: string,
): Promise<string> {
  const storage = createAdminClient().storage.from(CLOSET_BUCKET);
  const { error } = await storage.upload(path, data, { contentType, upsert: false });
  if (error) throw new Error(`Storage upload failed for ${path}: ${error.message}`);
  return storage.getPublicUrl(path).data.publicUrl;
}

export async function removeImages(paths: string[]) {
  if (paths.length === 0) return;
  const { error } = await createAdminClient().storage.from(CLOSET_BUCKET).remove(paths);
  if (error) console.error("Failed to clean up uploaded images", paths, error);
}
