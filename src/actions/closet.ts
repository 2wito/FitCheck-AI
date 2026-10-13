"use server";

import { revalidatePath } from "next/cache";

import { removeBackground } from "@/lib/ai/background";
import { analyzeClothing } from "@/lib/ai/vision";
import { getCurrentUserId, requireUser } from "@/lib/auth";
import { AUTH_ENABLED } from "@/lib/auth-mode";
import { ImageSearchNotConfiguredError, searchProductImages } from "@/lib/image-search";
import { prisma } from "@/lib/prisma";
import { fetchRemoteImage } from "@/lib/remote-image";
import { closetPathFromUrl, removeImages, uploadImage } from "@/lib/storage";
import { SupabaseConfigError } from "@/lib/supabase/config";
import { IMAGE_EXTENSIONS, readImageFile } from "@/lib/uploads";
import {
  clothingTagsSchema,
  remoteImageSchema,
  searchQuerySchema,
} from "@/lib/validations/clothing";
import type { ClothingTags } from "@/lib/validations/clothing";
import type {
  ActionResult,
  ClothingAnalysis,
  ClothingItem,
  ImageSearchResult,
  RemoteClothingAnalysis,
} from "@/types";

const NOT_SIGNED_IN = { success: false, error: "You must be signed in" } as const;
// requireUser() fails for a missing session with auth on, but only for DB errors in demo mode.
const USER_UNAVAILABLE = AUTH_ENABLED
  ? NOT_SIGNED_IN
  : ({ success: false, error: "Couldn't reach the database. Please try again." } as const);

// Tags the photo with AI and cuts out the background, in parallel. Either step may fail
// on its own; the user then fills in tags manually or keeps the original photo.
async function analyzeImage(
  bytes: Uint8Array<ArrayBuffer>,
  mediaType: string,
): Promise<ActionResult<ClothingAnalysis>> {
  const [tags, cutout] = await Promise.allSettled([
    analyzeClothing(bytes, mediaType),
    removeBackground(bytes, mediaType),
  ]);

  if (tags.status === "rejected") console.error("AI tagging failed", tags.reason);
  if (cutout.status === "rejected") console.error("Background removal failed", cutout.reason);

  if (tags.status === "rejected" && cutout.status === "rejected") {
    return { success: false, error: "We couldn't process this photo. Please try another one." };
  }

  return {
    success: true,
    data: {
      tags: tags.status === "fulfilled" ? tags.value : null,
      cutoutDataUrl:
        cutout.status === "fulfilled"
          ? `data:image/webp;base64,${cutout.value.toString("base64")}`
          : null,
    },
  };
}

// Step 1 of the upload flow: analyze an uploaded photo. Nothing is stored yet; the user
// reviews the result before saving.
export async function analyzeClothingImage(
  formData: FormData,
): Promise<ActionResult<ClothingAnalysis>> {
  if (!(await getCurrentUserId())) return NOT_SIGNED_IN;

  const image = readImageFile(formData, "image");
  if (typeof image === "string") return { success: false, error: image };

  return analyzeImage(new Uint8Array(await image.arrayBuffer()), image.type);
}

// Online search: finds product photos for a name/brand query.
export async function searchClothingImages(
  query: string,
): Promise<ActionResult<ImageSearchResult[]>> {
  if (!(await getCurrentUserId())) return NOT_SIGNED_IN;

  const parsed = searchQuerySchema.safeParse(query);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid search" };

  try {
    return { success: true, data: await searchProductImages(parsed.data) };
  } catch (error) {
    if (error instanceof ImageSearchNotConfiguredError) {
      return { success: false, error: "Online search isn't set up yet (missing SERPER_API_KEY)." };
    }
    console.error("Image search failed", error);
    return { success: false, error: "Search is unavailable right now. Please try again." };
  }
}

// Step 1 for a search result: download the chosen image server-side, then run the same
// analysis as an upload. The full-size image is tried first, then its thumbnail.
export async function analyzeClothingImageFromUrl(
  input: Pick<ImageSearchResult, "imageUrl" | "thumbnailUrl">,
): Promise<ActionResult<RemoteClothingAnalysis>> {
  if (!(await getCurrentUserId())) return NOT_SIGNED_IN;

  const parsed = remoteImageSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid image link" };

  let image: Awaited<ReturnType<typeof fetchRemoteImage>> | null = null;
  for (const url of new Set([parsed.data.imageUrl, parsed.data.thumbnailUrl])) {
    try {
      image = await fetchRemoteImage(url);
      break;
    } catch (error) {
      console.warn("Couldn't fetch search image", url, error instanceof Error ? error.message : error);
    }
  }
  if (!image) {
    return { success: false, error: "That image couldn't be downloaded. Try another result." };
  }

  const analysis = await analyzeImage(new Uint8Array(image.data), image.mediaType);
  if (!analysis.success) return analysis;

  return {
    success: true,
    data: {
      ...analysis.data,
      imageDataUrl: `data:${image.mediaType};base64,${image.data.toString("base64")}`,
    },
  };
}

// Step 2: store the original photo and the transparent cutout, then save the item.
export async function addClothingItem(
  formData: FormData,
): Promise<ActionResult<ClothingItem>> {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    console.error(error);
    return USER_UNAVAILABLE;
  }

  const original = readImageFile(formData, "image");
  if (typeof original === "string") return { success: false, error: original };

  const cutout = formData.get("cutout");
  // WebP is what we produce now; PNG is still accepted from older clients.
  if (
    cutout !== null &&
    (!(cutout instanceof File) || !["image/webp", "image/png"].includes(cutout.type))
  ) {
    return { success: false, error: "Invalid background-removed image" };
  }

  const parsed = clothingTagsSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    color: formData.get("color"),
    secondaryColor: formData.get("secondaryColor") || null,
    season: formData.get("season"),
    style: formData.get("style"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid item details" };
  }

  const id = crypto.randomUUID();
  const originalPath = `${user.id}/${id}/original.${IMAGE_EXTENSIONS[original.type]}`;
  const cutoutPath =
    cutout instanceof File ? `${user.id}/${id}/cutout.${IMAGE_EXTENSIONS[cutout.type]}` : null;
  const uploaded: string[] = [];

  try {
    const [imageUrl, bgRemovedUrl] = await Promise.all([
      uploadImage(originalPath, original, original.type).then((url) => {
        uploaded.push(originalPath);
        return url;
      }),
      cutout instanceof File && cutoutPath
        ? uploadImage(cutoutPath, cutout, cutout.type).then((url) => {
            uploaded.push(cutoutPath);
            return url;
          })
        : null,
    ]);

    const item = await prisma.clothingItem.create({
      data: { id, userId: user.id, ...parsed.data, imageUrl, bgRemovedUrl },
    });

    revalidatePath("/closet");
    return { success: true, data: item };
  } catch (error) {
    console.error("Failed to save clothing item", error);
    await removeImages(uploaded);
    if (error instanceof SupabaseConfigError) {
      return { success: false, error: `Image storage isn't configured: ${error.message}` };
    }
    return { success: false, error: "Couldn't save the item. Please try again." };
  }
}

// Edits an item's tags (from the closet card's "Edit tags" dialog).
export async function updateClothingItem(
  id: string,
  tags: ClothingTags,
): Promise<ActionResult<ClothingItem>> {
  const userId = await getCurrentUserId();
  if (!userId) return NOT_SIGNED_IN;

  const parsed = clothingTagsSchema.safeParse(tags);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid item details" };
  }

  // Scoping by userId means another user's item id simply isn't found.
  const { count } = await prisma.clothingItem.updateMany({
    where: { id, userId },
    data: parsed.data,
  });
  if (count === 0) return { success: false, error: "Item not found" };

  revalidatePath("/closet");
  revalidatePath("/outfits");
  const item = await prisma.clothingItem.findUniqueOrThrow({ where: { id } });
  return { success: true, data: item };
}

// Deletes an item and its images. Saved outfits lose this piece (cascade) but are kept.
export async function deleteClothingItem(id: string): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return NOT_SIGNED_IN;

  const item = await prisma.clothingItem.findFirst({
    where: { id, userId },
    select: { imageUrl: true, bgRemovedUrl: true },
  });
  if (!item) return { success: false, error: "Item not found" };

  try {
    await prisma.clothingItem.delete({ where: { id } });
  } catch (error) {
    console.error("Failed to delete clothing item", error);
    return { success: false, error: "Couldn't delete the item. Please try again." };
  }

  // Storage cleanup is best-effort: the item is already gone from the closet.
  await removeImages(
    [item.imageUrl, item.bgRemovedUrl].map(closetPathFromUrl).filter((p): p is string => !!p),
  ).catch((error) => console.error("Failed to remove item images", error));

  revalidatePath("/closet");
  revalidatePath("/outfits");
  return { success: true, data: undefined };
}
