"use client";

import { useRef, useState } from "react";
import { AlertCircle, Camera, Check, Loader2, RotateCcw, X } from "lucide-react";

import { addClothingItem, analyzeClothingImage } from "@/actions/closet";
import { Button } from "@/components/ui/button";
import { preloadBackgroundRemoval, removeBackgroundInBrowser } from "@/lib/background-removal";
import { prepareImage } from "@/lib/image";
import { cn } from "@/lib/utils";
import type { ClothingTags } from "@/types";

type Status = "preparing" | "analyzing" | "saving" | "done" | "error";

type Job = {
  id: string;
  previewUrl: string;
  status: Status;
  // Item name once saved, or the error to show.
  message?: string;
  // Saved without AI tags; the user should edit them.
  untagged?: boolean;
};

const STEPS: Record<Exclude<Status, "done" | "error">, { step: number; label: string }> = {
  preparing: { step: 1, label: "Compressing photo…" },
  analyzing: { step: 2, label: "Removing background & tagging…" },
  saving: { step: 3, label: "Saving to closet…" },
};

// Used when AI tagging fails: the item is still saved, and the user is told to edit it.
const FALLBACK_TAGS: ClothingTags = {
  name: "Untagged item",
  category: "TOPS",
  color: "unknown",
  secondaryColor: null,
  season: "ALL_WEATHER",
  style: "casual",
};

// "Take photo → auto save": one tap opens the camera, then compression, background removal,
// AI tagging and saving all happen in the background with per-photo progress. Several photos
// queue up and are processed one at a time (kinder to the server and the AI quota).
export function QuickCapture() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const files = useRef(new Map<string, File>());

  const update = (id: string, patch: Partial<Job>) =>
    setJobs((current) => current.map((job) => (job.id === id ? { ...job, ...patch } : job)));

  function dismiss(id: string) {
    setJobs((current) => {
      const job = current.find((j) => j.id === id);
      if (job) URL.revokeObjectURL(job.previewUrl);
      return current.filter((j) => j.id !== id);
    });
    files.current.delete(id);
  }

  async function process(id: string) {
    const file = files.current.get(id);
    if (!file) return;
    const fail = (message: string) => update(id, { status: "error", message });

    update(id, { status: "preparing", message: undefined });
    let image: File;
    try {
      // Also converts iPhone HEIC photos (decoded by the browser) to WebP.
      image = await prepareImage(file);
    } catch {
      return fail("Couldn't read this photo.");
    }

    update(id, { status: "analyzing" });
    const imageForm = new FormData();
    imageForm.append("image", image);
    // Tagging (server) and background removal (this device) run in parallel.
    const [analysis, cutout] = await Promise.all([
      analyzeClothingImage(imageForm).catch(() => null),
      removeBackgroundInBrowser(image).catch((error) => {
        console.warn("Background removal failed", error);
        return null;
      }),
    ]);
    if (!analysis?.success && !cutout) {
      return fail(analysis?.error ?? "Couldn't process this photo.");
    }
    const aiTags = analysis?.success ? analysis.data.tags : null;

    update(id, { status: "saving" });
    const tags = aiTags ?? FALLBACK_TAGS;
    const saveForm = new FormData();
    saveForm.append("image", image);
    if (cutout) saveForm.append("cutout", cutout);
    for (const [key, value] of Object.entries({
      ...tags,
      secondaryColor: tags.secondaryColor ?? "",
    })) {
      saveForm.append(key, value);
    }
    const saved = await addClothingItem(saveForm).catch(() => null);
    if (!saved?.success) return fail(saved?.error ?? "Couldn't save this item.");

    files.current.delete(id);
    update(id, { status: "done", message: saved.data.name, untagged: !aiTags });
    // Tagged items clear themselves; untagged ones stay until dismissed so the hint is seen.
    if (aiTags) setTimeout(() => dismiss(id), 4000);
  }

  // Opening the camera also starts the model download, so it overlaps with taking the photo.
  function openCamera() {
    preloadBackgroundRemoval();
    inputRef.current?.click();
  }

  function enqueue(id: string) {
    queue.current = queue.current.then(() => process(id));
  }

  function handleFiles(list: FileList | null) {
    for (const file of Array.from(list ?? [])) {
      if (!file.type.startsWith("image/")) continue;
      const id = crypto.randomUUID();
      files.current.set(id, file);
      setJobs((current) => [
        ...current,
        { id, previewUrl: URL.createObjectURL(file), status: "preparing" },
      ]);
      enqueue(id);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        // Any image: the browser decodes it (including HEIC on iPhone) before upload.
        accept="image/*"
        // Opens the rear camera directly on phones; a normal file picker on desktop.
        capture="environment"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {/* Desktop/tablet: inline button. Phones: floating camera button in thumb reach. */}
      <Button variant="outline" className="max-md:hidden" onClick={openCamera}>
        <Camera data-icon="inline-start" />
        Snap &amp; save
      </Button>
      <button
        type="button"
        onClick={openCamera}
        aria-label="Take a photo and add it to your closet"
        className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background transition-transform active:scale-95 md:hidden"
      >
        <Camera className="size-6" />
      </button>

      {jobs.length > 0 && (
        <ul
          aria-live="polite"
          aria-label="Photos being added"
          className="fixed right-20 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-4 z-30 flex flex-col gap-2 md:right-6 md:bottom-6 md:left-auto md:w-80"
        >
          {jobs.map((job) => (
            <JobRow
              key={job.id}
              job={job}
              onDismiss={() => dismiss(job.id)}
              onRetry={() => enqueue(job.id)}
            />
          ))}
        </ul>
      )}
    </>
  );
}

function JobRow({
  job,
  onDismiss,
  onRetry,
}: {
  job: Job;
  onDismiss: () => void;
  onRetry: () => void;
}) {
  const step = job.status in STEPS ? STEPS[job.status as keyof typeof STEPS] : null;

  return (
    <li className="flex items-center gap-3 rounded-xl border bg-popover p-2 text-sm shadow-lg">
      {/* Local object URL of the photo just taken. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={job.previewUrl} alt="" className="size-11 shrink-0 rounded-lg object-cover" />
      <div className="min-w-0 flex-1">
        {step ? (
          <>
            <p className="flex items-center gap-1.5 truncate">
              <Loader2 className="size-3.5 shrink-0 animate-spin" />
              {step.label}
            </p>
            <div
              className="mt-1.5 flex gap-1"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={3}
              aria-valuenow={step.step}
            >
              {[1, 2, 3].map((n) => (
                <span
                  key={n}
                  className={cn(
                    "h-1 flex-1 rounded-full",
                    n < step.step
                      ? "bg-foreground"
                      : n === step.step
                        ? "animate-pulse bg-foreground/50"
                        : "bg-muted",
                  )}
                />
              ))}
            </div>
          </>
        ) : job.status === "done" ? (
          <p className="truncate">
            <Check className="mr-1 inline size-3.5 text-emerald-600" />
            {job.untagged ? "Saved. Use Edit tags to categorize it." : `Added: ${job.message}`}
          </p>
        ) : (
          <p className="truncate text-destructive">
            <AlertCircle className="mr-1 inline size-3.5" />
            {job.message}
          </p>
        )}
      </div>
      {job.status === "error" && (
        <Button variant="ghost" size="icon-sm" aria-label="Retry" onClick={onRetry}>
          <RotateCcw />
        </Button>
      )}
      {(job.status === "done" || job.status === "error") && (
        <Button variant="ghost" size="icon-sm" aria-label="Dismiss" onClick={onDismiss}>
          <X />
        </Button>
      )}
    </li>
  );
}
