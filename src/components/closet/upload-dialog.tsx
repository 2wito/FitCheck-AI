"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Plus, Sparkles, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import {
  addClothingItem,
  analyzeClothingImage,
  analyzeClothingImageFromUrl,
} from "@/actions/closet";
import { OnlineImageSearch } from "@/components/closet/google-search-dialog";
import { Field, OptionSelect } from "@/components/shared/form-controls";
import { ImageDropzone } from "@/components/shared/image-dropzone";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Category, Season } from "@/generated/prisma/browser";
import {
  ACCEPTED_IMAGE_TYPES,
  CATEGORY_LABELS,
  SEASON_LABELS,
  STYLES,
  capitalize,
} from "@/lib/clothing";
import { dataUrlToFile, prepareImage } from "@/lib/image";
import type { ClothingAnalysis, ClothingTags, ImageSearchResult } from "@/types";

type Upload = {
  file: File;
  previewUrl: string;
};

type Step =
  | { kind: "select" }
  // previewUrl: a local object URL for uploads, or the result's thumbnail for searches.
  | { kind: "analyzing"; previewUrl: string }
  | { kind: "review"; upload: Upload; cutoutDataUrl: string | null; aiFailed: boolean };

type FormValues = Omit<ClothingTags, "secondaryColor"> & { secondaryColor: string };

const EMPTY_FORM: FormValues = {
  name: "",
  category: Category.TOPS,
  color: "",
  secondaryColor: "",
  season: Season.ALL_WEATHER,
  style: "casual",
};

const categoryItems = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }));
const seasonItems = Object.entries(SEASON_LABELS).map(([value, label]) => ({ value, label }));
const styleItems = STYLES.map((style) => ({ value: style, label: capitalize(style) }));

export function UploadDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>({ kind: "select" });
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [isSaving, startSaving] = useTransition();
  // Ignores analysis results that arrive after the user has moved on to another photo.
  const requestId = useRef(0);

  const previewUrl =
    step.kind === "analyzing" ? step.previewUrl : step.kind === "review" ? step.upload.previewUrl : null;
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function reset() {
    requestId.current++;
    setStep({ kind: "select" });
    setForm(EMPTY_FORM);
  }

  async function handleFile(file: File) {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Please choose a JPEG, PNG or WebP image.");
      return;
    }

    const id = ++requestId.current;
    let prepared: File;
    try {
      prepared = await prepareImage(file);
    } catch {
      toast.error("We couldn't read that image. Please try another one.");
      return;
    }
    if (id !== requestId.current) return;

    const upload = { file: prepared, previewUrl: URL.createObjectURL(prepared) };
    setStep({ kind: "analyzing", previewUrl: upload.previewUrl });

    const formData = new FormData();
    formData.append("image", prepared);
    const result = await analyzeClothingImage(formData).catch(() => null);
    if (id !== requestId.current) return;

    if (!result?.success) {
      toast.error(result?.error ?? "Something went wrong. Please try again.");
      setStep({ kind: "select" });
      return;
    }
    showReview(upload, result.data);
  }

  async function handleSearchResult(result: ImageSearchResult) {
    const id = ++requestId.current;
    setStep({ kind: "analyzing", previewUrl: result.thumbnailUrl });

    const analysis = await analyzeClothingImageFromUrl({
      imageUrl: result.imageUrl,
      thumbnailUrl: result.thumbnailUrl,
    }).catch(() => null);
    if (id !== requestId.current) return;

    if (!analysis?.success) {
      toast.error(analysis?.error ?? "Something went wrong. Please try another image.");
      setStep({ kind: "select" });
      return;
    }

    // The server re-encoded the image, so saving goes through the normal upload path.
    const file = await dataUrlToFile(analysis.data.imageDataUrl, "search-result.webp");
    if (id !== requestId.current) return;
    showReview({ file, previewUrl: URL.createObjectURL(file) }, analysis.data, result.title);
  }

  function showReview(upload: Upload, { tags, cutoutDataUrl }: ClothingAnalysis, fallbackName = "") {
    setForm(
      tags
        ? { ...tags, secondaryColor: tags.secondaryColor ?? "" }
        : { ...EMPTY_FORM, name: fallbackName.slice(0, 80) },
    );
    setStep({ kind: "review", upload, cutoutDataUrl, aiFailed: !tags });
  }

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step.kind !== "review") return;

    startSaving(async () => {
      const formData = new FormData();
      formData.append("image", step.upload.file);
      if (step.cutoutDataUrl) {
        formData.append("cutout", await dataUrlToFile(step.cutoutDataUrl, "cutout.png"));
      }
      for (const [key, value] of Object.entries(form)) formData.append(key, value);

      const result = await addClothingItem(formData).catch(() => null);
      if (!result?.success) {
        toast.error(result?.error ?? "Couldn't save the item. Please try again.");
        return;
      }
      toast.success(`${result.data.name} added to your closet`);
      setOpen(false);
      reset();
    });
  }

  function handleOpenChange(nextOpen: boolean) {
    if (isSaving) return;
    setOpen(nextOpen);
    if (!nextOpen) reset();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>
        <Plus data-icon="inline-start" />
        Add item
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add to your closet</DialogTitle>
          <DialogDescription>
            Upload a photo or find one online. We&apos;ll remove the background and tag it for you.
          </DialogDescription>
        </DialogHeader>

        {/* Hidden rather than unmounted, so search results survive "Use another photo". */}
        <div hidden={step.kind !== "select"}>
          <Tabs defaultValue="upload">
            <TabsList className="w-full">
              <TabsTrigger value="upload">Upload photo</TabsTrigger>
              <TabsTrigger value="search">Search online</TabsTrigger>
            </TabsList>
            <TabsContent value="upload" className="pt-2">
              <ImageDropzone
                onFile={handleFile}
                title="Drop a photo here or click to browse"
                hint="JPEG, PNG or WebP. One item per photo works best."
              />
            </TabsContent>
            <TabsContent value="search" keepMounted className="pt-2 data-hidden:hidden">
              <OnlineImageSearch onSelect={handleSearchResult} />
            </TabsContent>
          </Tabs>
        </div>

        {step.kind === "analyzing" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <ImagePreview src={step.previewUrl} analyzing />
            <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
              <p className="font-medium">Analyzing item &amp; removing background...</p>
              <p className="text-muted-foreground">This usually takes a few seconds.</p>
            </div>
          </div>
        )}

        {step.kind === "review" && (
          <form id="clothing-form" onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <ImagePreview src={step.cutoutDataUrl ?? step.upload.previewUrl} />
              {!step.cutoutDataUrl && (
                <Notice>Background removal failed, so the original photo will be used.</Notice>
              )}
            </div>

            <div className="flex flex-col gap-3">
              {step.aiFailed ? (
                <Notice>We couldn&apos;t auto-detect the details. Please fill them in.</Notice>
              ) : (
                <p className="flex items-center gap-1.5 text-muted-foreground">
                  <Sparkles className="size-4" />
                  AI-detected. Adjust anything that looks off.
                </p>
              )}

              <Field label="Name" htmlFor="name">
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Navy crewneck sweater"
                  maxLength={80}
                  required
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Category">
                  <OptionSelect
                    label="Category"
                    items={categoryItems}
                    value={form.category}
                    onChange={(category) => setForm({ ...form, category: category as Category })}
                  />
                </Field>
                <Field label="Season">
                  <OptionSelect
                    label="Season"
                    items={seasonItems}
                    value={form.season}
                    onChange={(season) => setForm({ ...form, season: season as Season })}
                  />
                </Field>
              </div>

              <Field label="Style">
                <OptionSelect
                  label="Style"
                  items={styleItems}
                  value={form.style}
                  onChange={(style) => setForm({ ...form, style: style as FormValues["style"] })}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Primary color" htmlFor="color">
                  <Input
                    id="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    placeholder="navy"
                    maxLength={40}
                    required
                  />
                </Field>
                <Field label="Secondary color" htmlFor="secondaryColor">
                  <Input
                    id="secondaryColor"
                    value={form.secondaryColor}
                    onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                    placeholder="Optional"
                    maxLength={40}
                  />
                </Field>
              </div>
            </div>
          </form>
        )}

        {step.kind === "review" && (
          <DialogFooter>
            <Button variant="outline" onClick={reset} disabled={isSaving}>
              Use another photo
            </Button>
            <Button type="submit" form="clothing-form" disabled={isSaving}>
              {isSaving && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {isSaving ? "Saving..." : "Save to closet"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}


function ImagePreview({ src, analyzing = false }: { src: string; analyzing?: boolean }) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-xl bg-checkerboard">
      {/* Object/data URLs or third-party thumbnails, so next/image doesn't apply. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Clothing item"
        referrerPolicy="no-referrer"
        className="size-full object-contain"
      />
      {analyzing && <div className="absolute inset-0 animate-pulse bg-background/40" />}
    </div>
  );
}



function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 rounded-lg bg-amber-500/10 px-3 py-2 text-amber-700 dark:text-amber-400">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" />
      {children}
    </p>
  );
}
