"use client";

import { BACKDROPS, type BackdropId } from "@/lib/backdrops";
import { cn } from "@/lib/utils";

// Swatch row for choosing the canvas backdrop: neutrals, then themed scenes.
export function BackdropPicker({
  value,
  onChange,
}: {
  value: BackdropId;
  onChange: (id: BackdropId) => void;
}) {
  const groups = [
    { label: "Neutral", items: BACKDROPS.filter((b) => b.group === "neutral") },
    { label: "Themed", items: BACKDROPS.filter((b) => b.group === "themed") },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Canvas backdrop"
      className="flex flex-wrap items-center gap-x-4 gap-y-2"
    >
      {groups.map((group) => (
        <div key={group.label} className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{group.label}</span>
          {group.items.map((backdrop) => (
            <button
              key={backdrop.id}
              type="button"
              role="radio"
              aria-checked={value === backdrop.id}
              aria-label={backdrop.label}
              title={backdrop.label}
              onClick={() => onChange(backdrop.id)}
              style={backdrop.style}
              className={cn(
                "size-7 rounded-full ring-1 ring-foreground/15 ring-offset-2 ring-offset-background transition-shadow",
                backdrop.className,
                value === backdrop.id ? "ring-2 ring-foreground" : "hover:ring-foreground/40",
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
