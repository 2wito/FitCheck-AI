"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUserId, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSignedUrl, PRIVATE_BUCKET, removeImages, uploadPrivateImage } from "@/lib/storage";
import { IMAGE_EXTENSIONS, readImageFile } from "@/lib/uploads";
import type { ActionResult } from "@/types";

// Returns a short-lived URL for the user's body photo, or null if they haven't added one.
export async function getBodyPhotoUrl(): Promise<ActionResult<string | null>> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "You must be signed in" };

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { bodyPhotoPath: true },
    });
    const url = user?.bodyPhotoPath ? await getSignedUrl(user.bodyPhotoPath) : null;
    return { success: true, data: url };
  } catch (error) {
    console.error("Failed to load body photo", error);
    return { success: false, error: "Couldn't load your photo. Please try again." };
  }
}

export async function uploadBodyPhoto(formData: FormData): Promise<ActionResult<string>> {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    console.error(error);
    return { success: false, error: "You must be signed in" };
  }

  const image = readImageFile(formData, "image");
  if (typeof image === "string") return { success: false, error: image };

  // A fresh path per upload, so a cached signed URL never shows the previous photo.
  const path = `${user.id}/body/${crypto.randomUUID()}.${IMAGE_EXTENSIONS[image.type]}`;
  try {
    await uploadPrivateImage(path, image, image.type);
    await prisma.user.update({ where: { id: user.id }, data: { bodyPhotoPath: path } });
  } catch (error) {
    console.error("Failed to save body photo", error);
    await removeImages([path], PRIVATE_BUCKET);
    return { success: false, error: "Couldn't save your photo. Please try again." };
  }

  if (user.bodyPhotoPath) await removeImages([user.bodyPhotoPath], PRIVATE_BUCKET);
  revalidatePath("/profile");

  const url = await getSignedUrl(path);
  return url
    ? { success: true, data: url }
    : { success: false, error: "Photo saved, but it couldn't be displayed. Refresh the page." };
}

export async function deleteBodyPhoto(): Promise<ActionResult> {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    console.error(error);
    return { success: false, error: "You must be signed in" };
  }

  if (user.bodyPhotoPath) {
    await prisma.user.update({ where: { id: user.id }, data: { bodyPhotoPath: null } });
    await removeImages([user.bodyPhotoPath], PRIVATE_BUCKET);
  }

  revalidatePath("/profile");
  return { success: true, data: undefined };
}
