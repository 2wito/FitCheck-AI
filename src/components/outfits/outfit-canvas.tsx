"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  BringToFront,
  Eraser,
  LayoutGrid,
  Minus,
  Plus,
  SendToBack,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { saveOutfit } from "@/actions/outfits";
import { AiStylistDialog } from "@/components/outfits/ai-stylist-dialog";
import { ClosetDrawer, DRAG_MIME } from "@/components/outfits/closet-drawer";
import { SaveOutfitDialog, type OutfitDetails } from "@/components/outfits/save-outfit-dialog";
import { TryOnModal } from "@/components/outfits/try-on-modal";
import { Button } from "@/components/ui/button";
import type { Occasion } from "@/lib/clothing";
import {
  autoLayout,
  clamp,
  clampScale,
  defaultScale,
  itemBoxStyle,
  moveLayer,
  normalizeLayers,
  slotFor,
  topZIndex,
} from "@/lib/outfit-layout";
import { cn } from "@/lib/utils";
import { MAX_OUTFIT_ITEMS } from "@/lib/validations/outfit";
import type { CanvasItem, ClothingItem, StylistSuggestion } from "@/types";

export type InitialOutfit = OutfitDetails & { id: string; items: CanvasItem[] };

type Point = { x: number; y: number };

const NUDGE = 0.01;
const SCALE_STEP = 1.1;

export function OutfitCanvas({
  closetItems,
  initialOutfit,
}: {
  closetItems: ClothingItem[];
  initialOutfit: InitialOutfit | null;
}) {
  const router = useRouter();
  const canvasRef = useRef<HTMLDivElement>(null);
  const closetById = useMemo(
    () => new Map(closetItems.map((item) => [item.id, item])),
    [closetItems],
  );

  const [items, setItems] = useState<CanvasItem[]>(() =>
    (initialOutfit?.items ?? []).filter((item) => closetById.has(item.clothingItemId)),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [outfitId, setOutfitId] = useState(initialOutfit?.id ?? null);
  const [details, setDetails] = useState<OutfitDetails>({
    name: initialOutfit?.name ?? "",
    occasion: initialOutfit?.occasion ?? "casual",
  });
  const [stylistNote, setStylistNote] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const onCanvas = useMemo(() => new Set(items.map((item) => item.clothingItemId)), [items]);
  const categoryOf = (id: string) => closetById.get(id)!.category;

  function addItem(id: string, at?: Point) {
    const clothing = closetById.get(id);
    if (!clothing) return;

    // Dropping an item that's already placed just moves it.
    if (onCanvas.has(id)) {
      if (at) updateItem(id, { positionX: at.x, positionY: at.y });
      setSelectedId(id);
      return;
    }
    if (items.length >= MAX_OUTFIT_ITEMS) {
      toast.error(`An outfit can have at most ${MAX_OUTFIT_ITEMS} items.`);
      return;
    }

    const slot = at
      ? { positionX: at.x, positionY: at.y, scale: defaultScale(clothing.category) }
      : slotFor(
          clothing.category,
          items.map((item) => categoryOf(item.clothingItemId)),
        );
    setItems([...items, { clothingItemId: id, ...slot, zIndex: topZIndex(items) + 1 }]);
    setSelectedId(id);
  }

  function updateItem(id: string, patch: Partial<CanvasItem>) {
    setItems((current) =>
      current.map((item) => (item.clothingItemId === id ? { ...item, ...patch } : item)),
    );
  }

  function removeItem(id: string) {
    setItems((current) => normalizeLayers(current.filter((item) => item.clothingItemId !== id)));
    setSelectedId((current) => (current === id ? null : current));
  }

  function rescale(id: string, factor: number) {
    setItems((current) =>
      current.map((item) =>
        item.clothingItemId === id ? { ...item, scale: clampScale(item.scale * factor) } : item,
      ),
    );
  }

  function changeLayer(id: string, direction: 1 | -1) {
    setItems((current) => moveLayer(current, id, direction));
  }

  function autoArrange() {
    setItems(autoLayout(items.map((item) => ({ id: item.clothingItemId, category: categoryOf(item.clothingItemId) }))));
  }

  function clearCanvas() {
    setItems([]);
    setSelectedId(null);
    setStylistNote(null);
  }

  function applySuggestion(suggestion: StylistSuggestion, occasion: Occasion) {
    const picked = suggestion.itemIds.flatMap((id) => {
      const item = closetById.get(id);
      return item ? [{ id, category: item.category }] : [];
    });
    setItems(autoLayout(picked));
    setSelectedId(null);
    setStylistNote(suggestion.reasoning);
    setDetails({ name: suggestion.name, occasion });
  }

  async function handleSave(next: OutfitDetails, asNew: boolean) {
    const result = await saveOutfit({
      id: asNew ? undefined : (outfitId ?? undefined),
      ...next,
      items,
    }).catch(() => null);

    if (!result?.success) {
      toast.error(result?.error ?? "Couldn't save the outfit. Please try again.");
      return false;
    }

    setOutfitId(result.data.id);
    setDetails(next);
    // Keep the URL pointing at the saved outfit without remounting the editor.
    window.history.replaceState(null, "", `/outfits/builder?id=${result.data.id}`);
    toast.success(`"${next.name}" saved`, {
      action: { label: "View outfits", onClick: () => router.push("/outfits") },
    });
    return true;
  }

  function pointToCanvas(clientX: number, clientY: number): Point {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: clamp((clientX - rect.left) / rect.width, 0, 1),
      y: clamp((clientY - rect.top) / rect.height, 0, 1),
    };
  }

  function handleItemKeyDown(id: string, event: React.KeyboardEvent) {
    const item = items.find((i) => i.clothingItemId === id)!;
    const step = event.shiftKey ? NUDGE * 5 : NUDGE;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };

    if (event.key in moves) {
      const [dx, dy] = moves[event.key];
      updateItem(id, {
        positionX: clamp(item.positionX + dx, 0, 1),
        positionY: clamp(item.positionY + dy, 0, 1),
      });
    } else if (event.key === "Delete" || event.key === "Backspace") {
      removeItem(id);
    } else if (event.key === "+" || event.key === "=") {
      rescale(id, SCALE_STEP);
    } else if (event.key === "-") {
      rescale(id, 1 / SCALE_STEP);
    } else if (event.key === "]") {
      changeLayer(id, 1);
    } else if (event.key === "[") {
      changeLayer(id, -1);
    } else if (event.key === "Escape") {
      setSelectedId(null);
      (event.currentTarget as HTMLElement).blur();
    } else {
      return;
    }
    event.preventDefault();
  }

  const selected = items.find((item) => item.clothingItemId === selectedId) ?? null;
  const maxZ = topZIndex(items);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {outfitId ? "Edit outfit" : "New outfit"}
          </h1>
          <p className="text-muted-foreground">
            {outfitId && details.name ? details.name : "Mix and match pieces from your closet."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AiStylistDialog
            canvasHasItems={items.length > 0}
            disabled={closetItems.length < 2}
            onGenerated={applySuggestion}
          />
          <TryOnModal
            clothingItemIds={items.map((item) => item.clothingItemId)}
            outfitId={outfitId}
          />
          <SaveOutfitDialog
            defaults={details}
            isExisting={outfitId !== null}
            disabled={items.length === 0}
            onSave={handleSave}
          />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="order-2 lg:order-1">
          <ClosetDrawer
            items={closetItems}
            onCanvas={onCanvas}
            onToggle={(id) => (onCanvas.has(id) ? removeItem(id) : addItem(id))}
          />
        </div>

        <section className="order-1 flex flex-col items-center gap-3 lg:order-2" aria-label="Outfit canvas">
          <div
            className="flex w-full flex-wrap items-center justify-between gap-2"
            role="toolbar"
            aria-label="Canvas tools"
          >
            <div className="flex items-center gap-1">
              <ToolButton label="Bring forward ( ] )" disabled={!selected || selected.zIndex >= maxZ} onClick={() => changeLayer(selected!.clothingItemId, 1)}>
                <BringToFront />
              </ToolButton>
              <ToolButton label="Send backward ( [ )" disabled={!selected || selected.zIndex <= 0} onClick={() => changeLayer(selected!.clothingItemId, -1)}>
                <SendToBack />
              </ToolButton>
              <ToolButton label="Smaller ( - )" disabled={!selected} onClick={() => rescale(selected!.clothingItemId, 1 / SCALE_STEP)}>
                <Minus />
              </ToolButton>
              <ToolButton label="Larger ( + )" disabled={!selected} onClick={() => rescale(selected!.clothingItemId, SCALE_STEP)}>
                <Plus />
              </ToolButton>
              <ToolButton label="Remove (Delete)" disabled={!selected} onClick={() => removeItem(selected!.clothingItemId)}>
                <Trash2 />
              </ToolButton>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={autoArrange} disabled={items.length === 0}>
                <LayoutGrid data-icon="inline-start" />
                Auto-arrange
              </Button>
              <Button variant="ghost" size="sm" onClick={clearCanvas} disabled={items.length === 0}>
                <Eraser data-icon="inline-start" />
                Clear
              </Button>
            </div>
          </div>

          <div
            ref={canvasRef}
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) setSelectedId(null);
            }}
            onDragOver={(e) => {
              if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              setIsDragOver(false);
              const id = e.dataTransfer.getData(DRAG_MIME);
              if (!id) return;
              e.preventDefault();
              addItem(id, pointToCanvas(e.clientX, e.clientY));
            }}
            className={cn(
              "relative aspect-[3/4] w-full max-w-[min(100%,calc((100dvh-15rem)*0.75))] overflow-hidden rounded-2xl bg-muted/40 ring-1 ring-foreground/10 transition-shadow select-none",
              isDragOver && "ring-2 ring-foreground/40",
            )}
          >
            {items.length === 0 && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
                <Sparkles className="size-6" />
                <p className="max-w-xs text-sm">
                  Drag items here, click them in your closet, or let the AI stylist pick an outfit for you.
                </p>
              </div>
            )}

            {items.map((item) => (
              <CanvasItemView
                key={item.clothingItemId}
                item={item}
                clothing={closetById.get(item.clothingItemId)!}
                selected={item.clothingItemId === selectedId}
                canvasRef={canvasRef}
                onSelect={() => setSelectedId(item.clothingItemId)}
                onChange={(patch) => updateItem(item.clothingItemId, patch)}
                onKeyDown={(e) => handleItemKeyDown(item.clothingItemId, e)}
              />
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Drag to move · drag the corner handle to resize · select an item and use arrow keys, + / −, [ / ] or Delete
          </p>

          {stylistNote && (
            <div className="flex w-full max-w-xl items-start gap-2 rounded-xl border bg-card p-3 text-sm">
              <Sparkles className="mt-0.5 size-4 shrink-0" />
              <p className="flex-1">
                <span className="font-medium">Stylist&apos;s note: </span>
                {stylistNote}
              </p>
              <button
                type="button"
                onClick={() => setStylistNote(null)}
                aria-label="Dismiss stylist's note"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

type Gesture =
  | { kind: "move"; startX: number; startY: number; originX: number; originY: number }
  | { kind: "resize"; centerX: number; centerY: number; startDistance: number; startScale: number };

function CanvasItemView({
  item,
  clothing,
  selected,
  canvasRef,
  onSelect,
  onChange,
  onKeyDown,
}: {
  item: CanvasItem;
  clothing: ClothingItem;
  selected: boolean;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onSelect: () => void;
  onChange: (patch: Partial<CanvasItem>) => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
}) {
  const gesture = useRef<Gesture | null>(null);

  function startMove(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    onSelect();
    gesture.current = {
      kind: "move",
      startX: event.clientX,
      startY: event.clientY,
      originX: item.positionX,
      originY: item.positionY,
    };
  }

  function startResize(event: React.PointerEvent<HTMLSpanElement>) {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = canvasRef.current!.getBoundingClientRect();
    const centerX = rect.left + item.positionX * rect.width;
    const centerY = rect.top + item.positionY * rect.height;
    gesture.current = {
      kind: "resize",
      centerX,
      centerY,
      startDistance: Math.max(Math.hypot(event.clientX - centerX, event.clientY - centerY), 1),
      startScale: item.scale,
    };
  }

  // Handles moves for both gestures: pointer events from the captured resize handle bubble up here.
  function handlePointerMove(event: React.PointerEvent) {
    const current = gesture.current;
    if (!current) return;
    const rect = canvasRef.current!.getBoundingClientRect();

    if (current.kind === "move") {
      onChange({
        positionX: clamp(current.originX + (event.clientX - current.startX) / rect.width, 0, 1),
        positionY: clamp(current.originY + (event.clientY - current.startY) / rect.height, 0, 1),
      });
    } else {
      const distance = Math.hypot(event.clientX - current.centerX, event.clientY - current.centerY);
      onChange({ scale: clampScale((current.startScale * distance) / current.startDistance) });
    }
  }

  function endGesture() {
    gesture.current = null;
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={clothing.name}
      aria-pressed={selected}
      onPointerDown={startMove}
      onPointerMove={handlePointerMove}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
      onFocus={onSelect}
      onKeyDown={onKeyDown}
      style={itemBoxStyle(item)}
      className={cn(
        "absolute cursor-move touch-none rounded-lg outline-none",
        selected && "outline-2 outline-offset-2 outline-dashed outline-foreground/50",
      )}
    >
      <Image
        src={clothing.bgRemovedUrl ?? clothing.imageUrl}
        alt=""
        fill
        sizes="(min-width: 1024px) 30vw, 60vw"
        draggable={false}
        className="pointer-events-none object-contain"
      />
      {selected && (
        <span
          onPointerDown={startResize}
          aria-hidden
          className="absolute -right-2 -bottom-2 size-4 cursor-nwse-resize rounded-full border-2 border-foreground bg-background shadow-sm pointer-coarse:size-6"
        />
      )}
    </div>
  );
}

function ToolButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="outline"
      size="icon-sm"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
