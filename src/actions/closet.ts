"use server";

import { revalidatePath } from "next/cache";

import { removeBackground } from "@/lib/ai/background";
import { analyzeClothing } from "@/lib/ai/vision";
import { getCurrentUserId, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { removeImages, uploadImage } from "@/lib/storage";
import { IMAGE_EXTENSIONS, readImageFile } from "@/lib/uploads";
import { clothingTagsSchema } from "@/lib/validations/clothing";
import type { ActionResult, ClothingAnalysis, ClothingItem } from "@/types";

// Step 1 of the upload flow: tag the photo with AI and cut out the background, in parallel.
// Nothing is stored yet; the user reviews the result before saving.
export async function analyzeClothingImage(
  formData: FormData,
): Promise<ActionResult<ClothingAnalysis>> {
  if (!(await getCurrentUserId())) return { success: false, error: "You must be signed in" };

  const image = readImageFile(formData, "image");
  if (typeof image === "string") return { success: false, error: image };

  const bytes = new Uint8Array(await image.arrayBuffer());
  const [tags, cutout] = await Promise.allSettled([
    analyzeClothing(bytes, image.type),
    removeBackground(bytes, image.type),
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
          ? `data:image/png;base64,${cutout.value.toString("base64")}`
          : null,
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
    return { success: false, error: "You must be signed in" };
  }

  const original = readImageFile(formData, "image");
  if (typeof original === "string") return { success: false, error: original };

  const cutout = formData.get("cutout");
  if (cutout !== null && (!(cutout instanceof File) || cutout.type !== "image/png")) {
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
  const cutoutPath = `${user.id}/${id}/cutout.png`;
  const uploaded: string[] = [];

  try {
    const [imageUrl, bgRemovedUrl] = await Promise.all([
      uploadImage(originalPath, original, original.type).then((url) => {
        uploaded.push(originalPath);
        return url;
      }),
      cutout
        ? uploadImage(cutoutPath, cutout, "image/png").then((url) => {
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
    return { success: false, error: "Couldn't save the item. Please try again." };
  }
}
