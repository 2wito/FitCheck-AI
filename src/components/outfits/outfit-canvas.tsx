"use client";

import { useMemo, useRef, useState, useTransition } from "react";
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
} from "lucide-react";
import { toast } from "sonner";

import { saveOutfit, scoreOutfit } from "@/actions/outfits";
import { AiStylistDialog } from "@/components/outfits/ai-stylist-dialog";
import { BackdropPicker } from "@/components/outfits/backdrop-picker";
import { ClosetDrawer, DRAG_MIME } from "@/components/outfits/closet-drawer";
import { MatchScorePanel } from "@/components/outfits/match-score";
import { SaveOutfitDialog, type OutfitDetails } from "@/components/outfits/save-outfit-dialog";
import { Button } from "@/components/ui/button";
import { DEFAULT_BACKDROP, getBackdrop, type BackdropId } from "@/lib/backdrops";
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
import type { CanvasItem, ClothingItem, MatchScore, StylistSuggestion } from "@/types";

export type InitialOutfit = OutfitDetails & {
  id: string;
  items: CanvasItem[];
  backdrop: BackdropId | null;
  match: Pick<MatchScore, "score" | "summary"> | null;
};

// A score is tied to the exact set of items it rated (positions don't matter).
type ScoredMatch = { value: MatchScore; itemsKey: string };
const itemsKey = (ids: Iterable<string>) => [...ids].sort().join(",");

type Point = { x: number; y: number };

const NUDGE = 0.01;
const SCALE_STEP = 1.1;

export function OutfitCanvas({
  closetItems,
  initialOutfit,
  initialAddId,
}: {
  closetItems: ClothingItem[];
  initialOutfit: InitialOutfit | null;
  // From the closet's "Send to canvas" action (?add=<itemId>).
  initialAddId: string | null;
}) {
  const router = useRouter();
  const canvasRef = useRef<HTMLDivElement>(null);
  const closetById = useMemo(
    () => new Map(closetItems.map((item) => [item.id, item])),
    [closetItems],
  );

  const [items, setItems] = useState<CanvasItem[]>(() => {
    const initial = (initialOutfit?.items ?? []).filter((item) =>
      closetById.has(item.clothingItemId),
    );
    const added = initialAddId ? closetById.get(initialAddId) : undefined;
    if (!added || initial.some((item) => item.clothingItemId === added.id)) return initial;
    const slot = slotFor(
      added.category,
      initial.map((item) => closetById.get(item.clothingItemId)!.category),
    );
    return [...initial, { clothingItemId: added.id, ...slot, zIndex: topZIndex(initial) + 1 }];
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [outfitId, setOutfitId] = useState(initialOutfit?.id ?? null);
  const [details, setDetails] = useState<OutfitDetails>({
    name: initialOutfit?.name ?? "",
    occasion: initialOutfit?.occasion ?? "casual",
  });
  const [backdrop, setBackdrop] = useState<BackdropId>(initialOutfit?.backdrop ?? DEFAULT_BACKDROP);
  const [match, setMatch] = useState<ScoredMatch | null>(() =>
    initialOutfit?.match
      ? {
          value: { ...initialOutfit.match, source: "saved" },
          itemsKey: itemsKey(initialOutfit.items.map((i) => i.clothingItemId)),
        }
      : null,
  );
  const [isScoring, startScoring] = useTransition();
  const [isDragOver, setIsDragOver] = useState(false);

  const onCanvas = useMemo(() => new Set(items.map((item) => item.clothingItemId)), [items]);
  const matchIsStale = match !== null && match.itemsKey !== itemsKey(onCanvas);
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
    setItems(
      autoLayout(
        items.map((item) => ({
          id: item.clothingItemId,
          category: categoryOf(item.clothingItemId),
        })),
      ),
    );
  }

  function clearCanvas() {
    setItems([]);
    setSelectedId(null);
    setMatch(null);
  }

  function applySuggestion(suggestion: StylistSuggestion, occasion: Occasion) {
    const picked = suggestion.itemIds.flatMap((id) => {
      const item = closetById.get(id);
      return item ? [{ id, category: item.category }] : [];
    });
    setItems(autoLayout(picked));
    setSelectedId(null);
    setMatch({
      value: { score: suggestion.matchScore, summary: suggestion.reasoning, source: "ai" },
      itemsKey: itemsKey(picked.map((p) => p.id)),
    });
    setDetails({ name: suggestion.name, occasion });
  }

  function checkMatch() {
    const ids = items.map((item) => item.clothingItemId);
    startScoring(async () => {
      const result = await scoreOutfit({ clothingItemIds: ids, occasion: details.occasion }).catch(
        () => null,
      );
      if (!result?.success) {
        toast.error(result?.error ?? "Couldn't score the outfit. Please try again.");
        return;
      }
      setMatch({ value: result.data, itemsKey: itemsKey(ids) });
    });
  }

  async function handleSave(next: OutfitDetails, asNew: boolean) {
    const result = await saveOutfit({
      id: asNew ? undefined : (outfitId ?? undefined),
      ...next,
      items,
      backdrop,
      // Only persist a score that still describes these exact items.
      match:
        match && !matchIsStale ? { score: match.value.score, summary: match.value.summary } : null,
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
  const scene = getBackdrop(backdrop);

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

        <section
          className="order-1 flex flex-col items-center gap-3 lg:order-2"
          aria-label="Outfit canvas"
        >
          <div
            className="flex w-full flex-wrap items-center justify-between gap-2"
            role="toolbar"
            aria-label="Canvas tools"
          >
            <div className="flex items-center gap-1">
              <ToolButton
                label="Bring forward ( ] )"
                disabled={!selected || selected.zIndex >= maxZ}
                onClick={() => changeLayer(selected!.clothingItemId, 1)}
              >
                <BringToFront />
              </ToolButton>
              <ToolButton
                label="Send backward ( [ )"
                disabled={!selected || selected.zIndex <= 0}
                onClick={() => changeLayer(selected!.clothingItemId, -1)}
              >
                <SendToBack />
              </ToolButton>
              <ToolButton
                label="Smaller ( - )"
                disabled={!selected}
                onClick={() => rescale(selected!.clothingItemId, 1 / SCALE_STEP)}
              >
                <Minus />
              </ToolButton>
              <ToolButton
                label="Larger ( + )"
                disabled={!selected}
                onClick={() => rescale(selected!.clothingItemId, SCALE_STEP)}
              >
                <Plus />
              </ToolButton>
              <ToolButton
                label="Remove (Delete)"
                disabled={!selected}
                onClick={() => removeItem(selected!.clothingItemId)}
              >
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
            style={scene.style}
            className={cn(
              "relative aspect-[3/4] w-full max-w-[min(100%,calc((100dvh-15rem)*0.75))] overflow-hidden rounded-2xl ring-1 ring-foreground/10 transition-shadow select-none",
              scene.className,
              isDragOver && "ring-2 ring-foreground/40",
            )}
          >
            {items.length === 0 && (
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 p-8 text-center",
                  scene.tone === "dark" ? "text-white/80" : "text-zinc-600",
                )}
              >
                <Sparkles className="size-6" />
                <p className="max-w-xs text-sm">
                  Drag items here, click them in your closet, or let the AI stylist pick an outfit
                  for you.
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

          <BackdropPicker value={backdrop} onChange={setBackdrop} />

          <p className="text-center text-xs text-muted-foreground">
            Drag to move · drag the corner handle to resize · select an item and use arrow keys, + /
            −, [ / ] or Delete
          </p>

          <MatchScorePanel
            match={match?.value ?? null}
            stale={matchIsStale}
            pending={isScoring}
            canScore={items.length >= 2}
            onCheck={checkMatch}
          />
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
        selected && "outline-2 outline-offset-2 outline-dashed outline-sky-500",
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
