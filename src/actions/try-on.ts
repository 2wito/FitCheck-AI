"use server";

import { revalidatePath } from "next/cache";

import {
  generateTryOnImage,
  TryOnQuotaError,
  TryOnUnavailableError,
} from "@/lib/ai/tryon";
import { getCurrentUserId, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  downloadPrivateImage,
  PRIVATE_BUCKET,
  removeImages,
  uploadPrivateImage,
} from "@/lib/storage";
import { IMAGE_EXTENSIONS, readImageFile } from "@/lib/uploads";
import { tryOnSchema, type TryOnInput } from "@/lib/validations/try-on";
import type { ActionResult } from "@/types";

const NOT_SIGNED_IN = { success: false, error: "You must be signed in" } as const;

// Generates a try-on image and returns it as a data URL. Nothing is stored until the
// user chooses to save it, so unwanted results never touch storage.
export async function generateTryOn(input: TryOnInput): Promise<ActionResult<string>> {
  const parsed = tryOnSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid outfit" };
  }
  const { clothingItemIds } = parsed.data;

  const userId = await getCurrentUserId();
  if (!userId) return NOT_SIGNED_IN;

  const [user, garments] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { bodyPhotoPath: true } }),
    prisma.clothingItem.findMany({
      where: { userId, id: { in: clothingItemIds } },
      select: { name: true, category: true, imageUrl: true, bgRemovedUrl: true },
    }),
  ]);

  if (!user?.bodyPhotoPath) {
    return { success: false, error: "Add a full-body photo of yourself first" };
  }
  if (garments.length !== clothingItemIds.length) {
    return { success: false, error: "Some items are no longer in your closet" };
  }

  try {
    const bodyPhoto = new Uint8Array(
      await (await downloadPrivateImage(user.bodyPhotoPath)).arrayBuffer(),
    );
    const result = await generateTryOnImage({ bodyPhoto, garments });
    return {
      success: true,
      data: `data:${result.mediaType};base64,${Buffer.from(result.data).toString("base64")}`,
    };
  } catch (error) {
    if (error instanceof TryOnQuotaError) {
      return {
        success: false,
        error:
          "Virtual try-on needs a Gemini API key with billing enabled (image generation isn't part of the free tier).",
      };
    }
    if (error instanceof TryOnUnavailableError) {
      return {
        success: false,
        error:
          "The AI couldn't create a try-on from this photo. A clear, well-lit, full-body photo works best.",
      };
    }
    console.error("Virtual try-on failed", error);
    return { success: false, error: "Try-on failed. Please try again in a moment." };
  }
}

// Saves a generated try-on to the user's favorites (private storage + a TryOn row).
export async function saveTryOn(formData: FormData): Promise<ActionResult<{ id: string }>> {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    console.error(error);
    return NOT_SIGNED_IN;
  }

  const image = readImageFile(formData, "image");
  if (typeof image === "string") return { success: false, error: image };

  // Only link outfits that belong to this user; otherwise save it unlinked.
  const outfitIdField = formData.get("outfitId");
  const outfit =
    typeof outfitIdField === "string" && outfitIdField
      ? await prisma.outfit.findFirst({
          where: { id: outfitIdField, userId: user.id },
          select: { id: true },
        })
      : null;

  const id = crypto.randomUUID();
  const path = `${user.id}/try-ons/${id}.${IMAGE_EXTENSIONS[image.type]}`;
  try {
    await uploadPrivateImage(path, image, image.type);
    await prisma.tryOn.create({
      data: { id, userId: user.id, outfitId: outfit?.id ?? null, imagePath: path },
    });
  } catch (error) {
    console.error("Failed to save try-on", error);
    await removeImages([path], PRIVATE_BUCKET);
    return { success: false, error: "Couldn't save the try-on. Please try again." };
  }

  revalidatePath("/profile");
  return { success: true, data: { id } };
}

export async function deleteTryOn(id: string): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return NOT_SIGNED_IN;

  const tryOn = await prisma.tryOn.findFirst({
    where: { id, userId },
    select: { imagePath: true },
  });
  if (!tryOn) return { success: false, error: "Try-on not found" };

  await prisma.tryOn.delete({ where: { id } });
  await removeImages([tryOn.imagePath], PRIVATE_BUCKET);

  revalidatePath("/profile");
  return { success: true, data: undefined };
}
