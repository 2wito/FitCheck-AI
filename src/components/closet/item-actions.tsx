"use client";

import { useTransition } from "react";
import Link from "next/link";
import { CalendarCheck, Loader2, Palette, Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { markItemsWorn, unmarkItemWorn } from "@/actions/wear";
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
}: {
  item: ClosetItem;
  onEdit: (item: ClosetItem) => void;
  onDelete: (item: ClosetItem) => void;
  className?: string;
}) {
  const [isLogging, startLogging] = useTransition();
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
    <div
      className={cn(
        "flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100",
        className,
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
