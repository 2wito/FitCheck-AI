"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Loader2, Lock, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteBodyPhoto, uploadBodyPhoto } from "@/actions/profile";
import { ImageDropzone } from "@/components/shared/image-dropzone";
import { Button } from "@/components/ui/button";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/clothing";
import { prepareImage } from "@/lib/image";
import { cn } from "@/lib/utils";

const PHOTO_TIPS = "Stand facing the camera, head to toe in frame, with good lighting and a plain background.";

export function BodyPhotoUpload({
  initialUrl,
  onChange,
  className,
}: {
  initialUrl: string | null;
  // Called with the new photo's URL after an upload, or null after removal.
  onChange?: (url: string | null) => void;
  className?: string;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [isPending, startTransition] = useTransition();

  function handleFile(file: File) {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Please choose a JPEG, PNG or WebP image.");
      return;
    }

    startTransition(async () => {
      let prepared: File;
      try {
        prepared = await prepareImage(file);
      } catch {
        toast.error("We couldn't read that image. Please try another one.");
        return;
      }

      const formData = new FormData();
      formData.append("image", prepared);
      const result = await uploadBodyPhoto(formData).catch(() => null);
      if (!result?.success) {
        toast.error(result?.error ?? "Couldn't save your photo. Please try again.");
        return;
      }
      setUrl(result.data);
      onChange?.(result.data);
      toast.success("Body photo saved");
    });
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await deleteBodyPhoto().catch(() => null);
      if (!result?.success) {
        toast.error(result?.error ?? "Couldn't remove your photo. Please try again.");
        return;
      }
      setUrl(null);
      onChange?.(null);
    });
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {url ? (
        <div className="flex flex-col gap-3">
          <div className="relative mx-auto aspect-[3/4] w-full max-w-xs overflow-hidden rounded-xl bg-muted">
            {/* Signed URLs change on every load, so skip the image optimizer's cache. */}
            <Image src={url} alt="Your body photo" fill unoptimized className="object-contain" />
            {isPending && <PendingOverlay />}
          </div>
          <div className="flex justify-center gap-2">
            <Button variant="outline" size="sm" disabled={isPending} nativeButton={false} render={<label />}>
              <RefreshCw data-icon="inline-start" />
              Replace
              <input
                type="file"
                accept={ACCEPTED_IMAGE_TYPES.join(",")}
                className="sr-only"
                disabled={isPending}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />
            </Button>
            <Button variant="outline" size="sm" onClick={handleRemove} disabled={isPending}>
              <Trash2 data-icon="inline-start" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <ImageDropzone
            onFile={handleFile}
            title="Upload a full-body photo"
            hint={PHOTO_TIPS}
            className={cn(isPending && "pointer-events-none opacity-60")}
          />
          {isPending && <PendingOverlay />}
        </div>
      )}

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <Lock className="size-3" />
        Stored privately. Only you can see it, and it&apos;s only used for virtual try-on.
      </p>
    </div>
  );
}

function PendingOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/60">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}
