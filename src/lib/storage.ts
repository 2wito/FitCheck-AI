import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

// Public bucket for clothing photos. Paths are `<userId>/<itemId>/<file>`, and the ids are
// unguessable UUIDs.
export const CLOSET_BUCKET = "closet";

// Private bucket for body photos and try-on results: `<userId>/body/...` and
// `<userId>/try-ons/...`. Never served publicly, only through short-lived signed URLs.
export const PRIVATE_BUCKET = "user-photos";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

type Bucket = typeof CLOSET_BUCKET | typeof PRIVATE_BUCKET;

async function upload(bucket: Bucket, path: string, data: Blob, contentType: string) {
  const { error } = await createAdminClient()
    .storage.from(bucket)
    .upload(path, data, { contentType, upsert: false });
  if (error) throw new Error(`Storage upload failed for ${path}: ${error.message}`);
}

export async function uploadImage(
  path: string,
  data: Blob,
  contentType: string,
): Promise<string> {
  await upload(CLOSET_BUCKET, path, data, contentType);
  return createAdminClient().storage.from(CLOSET_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function uploadPrivateImage(path: string, data: Blob, contentType: string) {
  await upload(PRIVATE_BUCKET, path, data, contentType);
}

export async function removeImages(paths: string[], bucket: Bucket = CLOSET_BUCKET) {
  if (paths.length === 0) return;
  const { error } = await createAdminClient().storage.from(bucket).remove(paths);
  if (error) console.error("Failed to clean up uploaded images", paths, error);
}

// Signed URLs for private images, keyed by path. Paths that fail to sign are omitted.
export async function getSignedUrls(paths: string[]): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();
  const { data, error } = await createAdminClient()
    .storage.from(PRIVATE_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  if (error) throw new Error(`Failed to sign URLs: ${error.message}`);
  return new Map(
    data.flatMap((entry) => (entry.path && entry.signedUrl ? [[entry.path, entry.signedUrl]] : [])),
  );
}

export async function getSignedUrl(path: string): Promise<string | null> {
  return (await getSignedUrls([path])).get(path) ?? null;
}

export async function downloadPrivateImage(path: string): Promise<Blob> {
  const { data, error } = await createAdminClient().storage.from(PRIVATE_BUCKET).download(path);
  if (error) throw new Error(`Failed to download ${path}: ${error.message}`);
  return data;
}
