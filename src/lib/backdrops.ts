// Outfit canvas backdrops, drawn as SVG (viewBox 300×400, the canvas's 3:4 ratio).
// One source for both uses: the editor/previews show it as a CSS background, and the snapshot
// export draws the same SVG onto a <canvas>. (CSS gradients can't be rasterized reliably in
// every browser; plain SVG can, without tainting the canvas.)

import type { CSSProperties } from "react";

type BackdropDefinition = {
  id: string;
  label: string;
  group: "neutral" | "themed";
  // Whether text and outlines drawn on top need light colors.
  tone: "light" | "dark";
  // null = transparent (shown as a checkerboard, exported with no background).
  svg: string | null;
};

const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" preserveAspectRatio="none">${body}</svg>`;

const DEFINITIONS = [
  {
    id: "studio-gray",
    label: "Studio Gray",
    group: "neutral",
    tone: "light",
    svg: svg(
      `<defs><radialGradient id="g" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="#f4f4f5"/><stop offset="1" stop-color="#d4d4d8"/></radialGradient></defs>` +
        `<rect width="300" height="400" fill="url(#g)"/>`,
    ),
  },
  {
    id: "clean-white",
    label: "Clean White",
    group: "neutral",
    tone: "light",
    svg: svg(`<rect width="300" height="400" fill="#ffffff"/>`),
  },
  {
    id: "dark-charcoal",
    label: "Dark Charcoal",
    group: "neutral",
    tone: "dark",
    svg: svg(
      `<defs><radialGradient id="g" cx="50%" cy="30%" r="80%"><stop offset="0" stop-color="#3f3f46"/><stop offset="1" stop-color="#18181b"/></radialGradient></defs>` +
        `<rect width="300" height="400" fill="url(#g)"/>`,
    ),
  },
  { id: "transparent", label: "Transparent", group: "neutral", tone: "light", svg: null },
  {
    id: "urban-street",
    label: "Urban Street",
    group: "themed",
    tone: "dark",
    svg: svg(
      `<defs>` +
        // Running-bond brick wall: joints offset every other course.
        `<pattern id="b" width="48" height="24" patternUnits="userSpaceOnUse"><rect width="48" height="24" fill="#9a6650"/>` +
        `<path d="M0 11.5H48M0 23.5H48M24 0V12M0 12V24" stroke="#000" stroke-opacity=".18" stroke-width="1.5"/></pattern>` +
        `<linearGradient id="p" x2="0" y2="1"><stop offset="0" stop-color="#57534e"/><stop offset="1" stop-color="#3a3735"/></linearGradient>` +
        `<linearGradient id="v" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".25"/><stop offset=".5" stop-color="#000" stop-opacity="0"/></linearGradient>` +
        `</defs>` +
        `<rect width="300" height="272" fill="url(#b)"/><rect width="300" height="272" fill="url(#v)"/>` +
        `<rect y="272" width="300" height="128" fill="url(#p)"/><rect y="272" width="300" height="4" fill="#000" fill-opacity=".3"/>`,
    ),
  },
  {
    id: "cozy-cafe",
    label: "Cozy Café",
    group: "themed",
    tone: "dark",
    svg: svg(
      `<defs>` +
        `<linearGradient id="w" x2="0" y2="1"><stop offset="0" stop-color="#6b4a33"/><stop offset="1" stop-color="#8a6244"/></linearGradient>` +
        `<pattern id="s" width="32" height="400" patternUnits="userSpaceOnUse"><rect width="2" height="400" fill="#000" fill-opacity=".12"/></pattern>` +
        `<radialGradient id="l"><stop offset="0" stop-color="#ffd696" stop-opacity=".7"/><stop offset="1" stop-color="#ffd696" stop-opacity="0"/></radialGradient>` +
        `<linearGradient id="f" x2="0" y2="1"><stop offset="0" stop-color="#4a3121"/><stop offset="1" stop-color="#2e1e13"/></linearGradient>` +
        `</defs>` +
        `<rect width="300" height="264" fill="url(#w)"/><rect width="300" height="264" fill="url(#s)"/>` +
        `<circle cx="66" cy="58" r="95" fill="url(#l)"/><circle cx="234" cy="70" r="80" fill="url(#l)"/>` +
        `<path d="M66 0V42M234 0V54" stroke="#2a1a10" stroke-width="2"/>` +
        `<path d="M54 42h24l-5 12H59zM222 54h24l-5 12h-14z" fill="#2a1a10"/>` +
        `<rect y="264" width="300" height="136" fill="url(#f)"/><rect y="264" width="300" height="3" fill="#000" fill-opacity=".3"/>`,
    ),
  },
  {
    id: "red-carpet",
    label: "Evening / Red Carpet",
    group: "themed",
    tone: "dark",
    svg: svg(
      `<defs>` +
        `<linearGradient id="bg" x2="0" y2="1"><stop offset="0" stop-color="#120a0d"/><stop offset="1" stop-color="#2a1218"/></linearGradient>` +
        `<radialGradient id="spot" cx="50%" cy="0%" r="75%"><stop offset="0" stop-color="#ffecbe" stop-opacity=".45"/><stop offset="1" stop-color="#ffecbe" stop-opacity="0"/></radialGradient>` +
        `<linearGradient id="c" x2="0" y2="1"><stop offset="0" stop-color="#9f1239"/><stop offset="1" stop-color="#6d0b1f"/></linearGradient>` +
        `</defs>` +
        `<rect width="300" height="400" fill="url(#bg)"/><rect width="300" height="400" fill="url(#spot)"/>` +
        `<rect y="248" width="300" height="152" fill="#160b0e"/>` +
        `<polygon points="112,248 188,248 292,400 8,400" fill="url(#c)"/>` +
        `<g fill="#fff" fill-opacity=".55"><circle cx="45" cy="92" r="1.5"/><circle cx="255" cy="70" r="1.5"/><circle cx="82" cy="40" r="1"/><circle cx="222" cy="132" r="1"/><circle cx="160" cy="28" r="1"/></g>`,
    ),
  },
  {
    id: "nature-park",
    label: "Nature / Park",
    group: "themed",
    tone: "light",
    svg: svg(
      `<defs>` +
        `<linearGradient id="sky" x2="0" y2="1"><stop offset="0" stop-color="#b9e0f5"/><stop offset="1" stop-color="#e6f5fb"/></linearGradient>` +
        `<radialGradient id="sun"><stop offset="0" stop-color="#fff8c8"/><stop offset=".3" stop-color="#fff8c8" stop-opacity=".8"/><stop offset="1" stop-color="#fff8c8" stop-opacity="0"/></radialGradient>` +
        `<linearGradient id="grass" x2="0" y2="1"><stop offset="0" stop-color="#93c47d"/><stop offset="1" stop-color="#5f8f45"/></linearGradient>` +
        `</defs>` +
        `<rect width="300" height="230" fill="url(#sky)"/><circle cx="246" cy="48" r="60" fill="url(#sun)"/>` +
        `<path d="M0 214Q60 176 120 208T240 198T300 204V232H0Z" fill="#86b86a"/>` +
        `<rect x="36" y="190" width="5" height="26" fill="#6b4f35"/><circle cx="38" cy="182" r="20" fill="#5f8f45"/>` +
        `<rect y="226" width="300" height="174" fill="url(#grass)"/>`,
    ),
  },
] as const satisfies readonly BackdropDefinition[];

export type BackdropId = (typeof DEFINITIONS)[number]["id"];

export type Backdrop = BackdropDefinition & {
  id: BackdropId;
  // Ready-to-use CSS: an SVG background, or the checkerboard utility for transparent.
  style?: CSSProperties;
  className?: string;
};

export const svgDataUrl = (markup: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;

export const BACKDROPS: readonly Backdrop[] = DEFINITIONS.map((d) =>
  d.svg
    ? {
        ...d,
        style: { backgroundImage: `url("${svgDataUrl(d.svg)}")`, backgroundSize: "100% 100%" },
      }
    : { ...d, className: "bg-checkerboard" },
);

export const BACKDROP_IDS = DEFINITIONS.map((b) => b.id) as [BackdropId, ...BackdropId[]];

export const DEFAULT_BACKDROP: BackdropId = "studio-gray";

export function getBackdrop(id: string | null | undefined): Backdrop {
  return BACKDROPS.find((b) => b.id === id) ?? BACKDROPS[0];
}
