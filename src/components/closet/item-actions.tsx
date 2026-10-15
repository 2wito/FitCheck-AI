"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CalendarCheck, Ellipsis, Loader2, Palette, Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { markItemsWorn, unmarkItemWorn } from "@/actions/wear";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { todayKey } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { ClosetItem } from "@/types";

// Quick actions shown over a closet card on hover/focus (always visible on touch screens,
// which have no hover).
export function ItemQuickActions({
  item,
  onEdit,
  onDelete,
  className,
  vertical = false,
}: {
  item: ClosetItem;
  onEdit: (item: ClosetItem) => void;
  onDelete: (item: ClosetItem) => void;
  className?: string;
  // Stack the hover buttons vertically (wardrobe view).
  vertical?: boolean;
}) {
  const [isLogging, startLogging] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const wornToday = item.wear.lastWornAt === todayKey();

  function logWornToday() {
    const date = todayKey();
    startLogging(async () => {
      const result = await markItemsWorn({ clothingItemIds: [item.id], date }).catch(() => null);
      if (!result?.success) {
        toast.error(result?.error ?? "Couldn't log that. Please try again.");
        return;
      }
      toast.success(`Logged "${item.name}" as worn today`, {
        action: {
          label: "Undo",
          onClick: () => void unmarkItemWorn({ clothingItemId: item.id, date }),
        },
      });
    });
  }

  return (
    <div className={className}>
      {/* Touch screens have no hover: one large button opens an action sheet instead. */}
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        aria-label={`Actions for ${item.name}`}
        className={cn(buttonClasses(), "hidden size-12 pointer-coarse:flex [&_svg]:size-5")}
      >
        <Ellipsis />
      </button>
      <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="truncate pr-8">{item.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="justify-start"
              disabled={isLogging || wornToday}
              onClick={() => {
                setSheetOpen(false);
                logWornToday();
              }}
            >
              <CalendarCheck data-icon="inline-start" />
              {wornToday ? "Worn today ✓" : "Worn today"}
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => {
                setSheetOpen(false);
                onEdit(item);
              }}
            >
              <Tag data-icon="inline-start" />
              Edit tags
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              nativeButton={false}
              render={<Link href={`/outfits/builder?add=${item.id}`} />}
            >
              <Palette data-icon="inline-start" />
              Send to canvas
            </Button>
            <Button
              variant="destructive"
              className="justify-start"
              onClick={() => {
                setSheetOpen(false);
                onDelete(item);
              }}
            >
              <Trash2 data-icon="inline-start" />
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div
        className={cn(
          "flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:hidden",
          vertical && "flex-col",
        )}
      >
        <ActionButton
          label={`Delete ${item.name}`}
          tooltip="Delete"
          onClick={() => onDelete(item)}
          destructive
        >
          <Trash2 />
        </ActionButton>
        <ActionButton
          label={`Edit tags for ${item.name}`}
          tooltip="Edit tags"
          onClick={() => onEdit(item)}
        >
          <Tag />
        </ActionButton>
        <ActionButton
          label={
            wornToday ? `${item.name} is logged as worn today` : `Mark ${item.name} as worn today`
          }
          tooltip={wornToday ? "Worn today ✓" : "Worn today"}
          onClick={logWornToday}
          disabled={isLogging || wornToday}
        >
          {isLogging ? <Loader2 className="animate-spin" /> : <CalendarCheck />}
        </ActionButton>
        <Link
          href={`/outfits/builder?add=${item.id}`}
          aria-label={`Send ${item.name} to the outfit canvas`}
          title="Send to canvas"
          className={buttonClasses()}
        >
          <Palette />
        </Link>
      </div>
    </div>
  );
}

function buttonClasses(destructive = false) {
  return cn(
    "flex size-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm ring-1 ring-foreground/10 backdrop-blur transition-colors [&_svg]:size-4",
    "hover:bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
    destructive && "hover:text-destructive",
    "disabled:opacity-60",
  );
}

function ActionButton({
  label,
  tooltip,
  onClick,
  destructive,
  disabled,
  children,
}: {
  label: string;
  tooltip: string;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      title={tooltip}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={buttonClasses(destructive)}
    >
      {children}
    </button>
  );
}
