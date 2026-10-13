// Outfit canvas backdrops. Pure CSS (gradients and patterns), so they cost nothing to serve,
// scale to any size and look identical in the editor and in saved-outfit previews.

import type { CSSProperties } from "react";

export type Backdrop = {
  id: string;
  label: string;
  group: "neutral" | "themed";
  // Whether text and outlines drawn on top need light colors.
  tone: "light" | "dark";
  // Tailwind class for backdrops that reuse a utility (the transparent checkerboard).
  className?: string;
  style?: CSSProperties;
};

export const BACKDROPS = [
  {
    id: "studio-gray",
    label: "Studio Gray",
    group: "neutral",
    tone: "light",
    style: { background: "radial-gradient(circle at 50% 35%, #f4f4f5 0%, #d4d4d8 100%)" },
  },
  {
    id: "clean-white",
    label: "Clean White",
    group: "neutral",
    tone: "light",
    style: { background: "#ffffff" },
  },
  {
    id: "dark-charcoal",
    label: "Dark Charcoal",
    group: "neutral",
    tone: "dark",
    style: { background: "radial-gradient(circle at 50% 30%, #3f3f46 0%, #18181b 100%)" },
  },
  {
    id: "transparent",
    label: "Transparent",
    group: "neutral",
    tone: "light",
    className: "bg-checkerboard",
  },
  {
    id: "urban-street",
    label: "Urban Street",
    group: "themed",
    tone: "dark",
    style: {
      background: [
        // Brick courses on the wall, then the wall/pavement split.
        "repeating-linear-gradient(0deg, transparent 0 22px, rgba(0,0,0,.12) 22px 24px)",
        "repeating-linear-gradient(90deg, transparent 0 46px, rgba(0,0,0,.08) 46px 48px)",
        "linear-gradient(to bottom, #8b5e4b 0%, #a06a52 68%, #57534e 68%, #44403c 100%)",
      ].join(", "),
    },
  },
  {
    id: "cozy-cafe",
    label: "Cozy Café",
    group: "themed",
    tone: "dark",
    style: {
      background: [
        "radial-gradient(circle at 22% 14%, rgba(255,214,150,.6) 0%, transparent 38%)",
        "radial-gradient(circle at 78% 18%, rgba(255,214,150,.4) 0%, transparent 32%)",
        "repeating-linear-gradient(90deg, rgba(0,0,0,.1) 0 2px, transparent 2px 64px)",
        "linear-gradient(to bottom, #6b4a33 0%, #8a6244 66%, #4a3121 66%, #3b2719 100%)",
      ].join(", "),
    },
  },
  {
    id: "red-carpet",
    label: "Evening / Red Carpet",
    group: "themed",
    tone: "dark",
    style: {
      background: [
        "radial-gradient(ellipse at 50% -10%, rgba(255,236,190,.45) 0%, transparent 55%)",
        "radial-gradient(circle at 15% 30%, rgba(255,255,255,.25) 0 1.5px, transparent 2px)",
        "radial-gradient(circle at 85% 22%, rgba(255,255,255,.25) 0 1.5px, transparent 2px)",
        "linear-gradient(to bottom, #120a0d 0%, #2a1218 62%, #9f1239 62%, #6d0b1f 100%)",
      ].join(", "),
    },
  },
  {
    id: "nature-park",
    label: "Nature / Park",
    group: "themed",
    tone: "light",
    style: {
      background: [
        "radial-gradient(circle at 82% 12%, rgba(255,248,200,.9) 0%, transparent 18%)",
        "radial-gradient(ellipse at 20% 58%, #86b86a 0%, transparent 40%)",
        "linear-gradient(to bottom, #b9e0f5 0%, #e6f5fb 56%, #93c47d 56%, #5f8f45 100%)",
      ].join(", "),
    },
  },
] as const satisfies readonly Backdrop[];

export type BackdropId = (typeof BACKDROPS)[number]["id"];

export const BACKDROP_IDS = BACKDROPS.map((b) => b.id) as [BackdropId, ...BackdropId[]];

export const DEFAULT_BACKDROP: BackdropId = "studio-gray";

export function getBackdrop(id: string | null | undefined): Backdrop {
  return BACKDROPS.find((b) => b.id === id) ?? BACKDROPS[0];
}
