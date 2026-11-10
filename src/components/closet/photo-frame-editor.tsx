"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Maximize, Minus, Plus } from "lucide-react";
import { toast } from "sonner";

import { updateItemFraming } from "@/actions/closet";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ITEM_TYPE_LABELS } from "@/lib/clothing";
import {
  FRAME_HEIGHT,
  FRAME_WIDTH,
  autoPlacement,
  fetchImage,
  guideFor,
  renderFramed,
  type Placement,
} from "@/lib/item-frame";
import type { ClosetItem } from "@/types";

const pct = (value: number, total: number) => `${(value / total) * 100}%`;

// "Edit photo": drag and zoom the item until it fills the dashed guide frame for its type,
// so it shows at the same size as every other item of that type.
// Keyed by item id by the caller, so state resets per item.
export function PhotoFrameEditor({
  item,
  onClose,
}: {
  item: ClosetItem | null;
  onClose: () => void;
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [failed, setFailed] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const stageRef = useRef<HTMLDivElement>(null);
  // Active pointers (one = drag, two = pinch), in client pixels.
  const pointers = useRef(new Map<number, { x: number; y: number }>());

  // Always edit from the untouched cutout, so repeated edits never lose quality.
  const source = item ? (item.bgRemovedUrl ?? item.imageUrl) : null;
  const type = item?.type;
  useEffect(() => {
    if (!source || !type) return;
    let cancelled = false;
    let loadedUrl: string | null = null;
    fetchImage(source)
      .then((loaded) => {
        loadedUrl = loaded.src;
        if (cancelled) return URL.revokeObjectURL(loaded.src);
        setImage(loaded);
        setPlacement(autoPlacement(loaded, type));
      })
      .catch((error) => {
        console.warn("Couldn't load item photo", error);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (loadedUrl) URL.revokeObjectURL(loadedUrl);
    };
  }, [source, type]);

  const guide = item ? guideFor(item.type) : null;

  // Canvas pixels per screen pixel (the stage is shown smaller than the 800×1000 canvas).
  const canvasPerPixel = () => FRAME_WIDTH / (stageRef.current?.clientWidth || FRAME_WIDTH);

  // Zoom around a canvas point (default: the image's current center), so it stays put.
  function zoom(factor: number, around?: { x: number; y: number }) {
    if (!image) return;
    setPlacement((p) => {
      if (!p) return p;
      const scale = Math.min(Math.max(p.scale * factor, 0.02), 20);
      const cx = around?.x ?? p.x + (image.naturalWidth * p.scale) / 2;
      const cy = around?.y ?? p.y + (image.naturalHeight * p.scale) / 2;
      const ratio = scale / p.scale;
      return { scale, x: cx - (cx - p.x) * ratio, y: cy - (cy - p.y) * ratio };
    });
  }

  function onPointerDown(event: React.PointerEvent) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
  }

  function onPointerMove(event: React.PointerEvent) {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    const k = canvasPerPixel();

    if (pointers.current.size === 2) {
      // Pinch: zoom by the change in distance between the two fingers.
      const other = [...pointers.current.entries()].find(([id]) => id !== event.pointerId)?.[1];
      if (other) {
        const before = Math.hypot(previous.x - other.x, previous.y - other.y);
        const after = Math.hypot(event.clientX - other.x, event.clientY - other.y);
        const rect = stageRef.current!.getBoundingClientRect();
        if (before > 0) {
          zoom(after / before, {
            x: ((event.clientX + other.x) / 2 - rect.left) * k,
            y: ((event.clientY + other.y) / 2 - rect.top) * k,
          });
        }
      }
    } else {
      const dx = (event.clientX - previous.x) * k;
      const dy = (event.clientY - previous.y) * k;
      setPlacement((p) => (p ? { ...p, x: p.x + dx, y: p.y + dy } : p));
    }
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
  }

  function onPointerUp(event: React.PointerEvent) {
    pointers.current.delete(event.pointerId);
  }

  function onWheel(event: React.WheelEvent) {
    const rect = stageRef.current!.getBoundingClientRect();
    const k = canvasPerPixel();
    zoom(event.deltaY < 0 ? 1.06 : 1 / 1.06, {
      x: (event.clientX - rect.left) * k,
      y: (event.clientY - rect.top) * k,
    });
  }

  function save() {
    if (!item || !image || !placement) return;
    startSaving(async () => {
      try {
        const formData = new FormData();
        formData.append("framed", await renderFramed(image, placement));
        const result = await updateItemFraming(item.id, formData);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success("Photo updated");
        onClose();
      } catch {
        toast.error("Couldn't save the photo. Please try again.");
      }
    });
  }

  return (
    <Dialog open={item !== null} onOpenChange={(open) => !open && !isSaving && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit photo</DialogTitle>
          <DialogDescription>
            Drag and zoom so the item fills the dashed frame. Every item in{" "}
            {item ? ITEM_TYPE_LABELS[item.type] : "this type"} uses the same frame, so they all
            show at the same size.
          </DialogDescription>
        </DialogHeader>

        <div
          ref={stageRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
          className="relative mx-auto aspect-[4/5] w-full max-w-72 cursor-grab touch-none overflow-hidden rounded-2xl bg-gradient-to-b from-muted/40 to-muted/80 ring-1 ring-foreground/10 select-none active:cursor-grabbing"
        >
          {image && placement ? (
            // eslint-disable-next-line @next/next/no-img-element -- a local object URL, positioned by hand
            <img
              src={image.src}
              alt={item?.name ?? ""}
              draggable={false}
              className="pointer-events-none absolute max-w-none"
              style={{
                left: pct(placement.x, FRAME_WIDTH),
                top: pct(placement.y, FRAME_HEIGHT),
                width: pct(image.naturalWidth * placement.scale, FRAME_WIDTH),
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              {failed ? "Couldn't load this photo." : <Loader2 className="size-5 animate-spin" />}
            </div>
          )}
          {guide && (
            <div
              aria-hidden
              className="pointer-events-none absolute rounded-lg border-2 border-dashed border-primary/70"
              style={{
                left: pct(guide.x, FRAME_WIDTH),
                top: pct(guide.y, FRAME_HEIGHT),
                width: pct(guide.w, FRAME_WIDTH),
                height: pct(guide.h, FRAME_HEIGHT),
              }}
            />
          )}
        </div>

        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Zoom out"
            onClick={() => zoom(1 / 1.1)}
            disabled={!placement}
          >
            <Minus />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Zoom in"
            onClick={() => zoom(1.1)}
            disabled={!placement}
          >
            <Plus />
          </Button>
          <Button
            variant="outline"
            onClick={() => image && item && setPlacement(autoPlacement(image, item.type))}
            disabled={!image}
          >
            <Maximize data-icon="inline-start" />
            Auto-fit
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={isSaving || !placement}>
            {isSaving && <Loader2 data-icon="inline-start" className="animate-spin" />}
            Save photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
