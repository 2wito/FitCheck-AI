"use client";

import Link from "next/link";
import { Palette, Tag, Trash2 } from "lucide-react";

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
  return (
    <div
      className={cn(
        "flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100",
        className,
      )}
    >
      <ActionButton label={`Delete ${item.name}`} onClick={() => onDelete(item)} destructive>
        <Trash2 />
      </ActionButton>
      <ActionButton label={`Edit tags for ${item.name}`} onClick={() => onEdit(item)}>
        <Tag />
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
  );
}

function ActionButton({
  label,
  onClick,
  destructive,
  children,
}: {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label.split(" ").slice(0, 2).join(" ")}
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
