import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  CalendarDays,
  CloudSun,
  Code2,
  Palette,
  ScanLine,
  Shirt,
  Shuffle,
  Sparkles,
  Tags,
  Wand2,
} from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: { absolute: "FitCheck AI: your closet, styled by AI" },
};

const REPO_URL = "https://github.com/2wito/FitCheck-AI";

const FEATURES = [
  {
    icon: ScanLine,
    title: "Background removal in the browser",
    body: "Snap a photo and the item is cut out on your device, then framed so every shirt, pair of jeans or shoe shows at the same size.",
  },
  {
    icon: Tags,
    title: "AI clothing tags",
    body: "Gemini vision sorts each item into shirts, hoodies, jeans, coats and more, and fills in colors, season and style.",
  },
  {
    icon: Wand2,
    title: "AI stylist",
    body: "Describe the occasion and get complete outfits built only from what is in your closet.",
  },
  {
    icon: Palette,
    title: "Outfit canvas",
    body: "Drag, resize and layer pieces on a canvas with backdrops, undo and image export.",
  },
  {
    icon: Shuffle,
    title: "Mix & Match",
    body: "Swipe through tops, bottoms and shoes to find combinations you never tried, with a live match score.",
  },
  {
    icon: CalendarDays,
    title: "Your own sections",
    body: "Group pieces your way, like Elegant or Gym, plan looks on a calendar and see what sits unused.",
  },
] as const;

const STACK = [
  "Next.js 16",
  "React 19",
  "TypeScript",
  "Tailwind CSS",
  "Supabase",
  "Prisma",
  "Gemini (AI SDK)",
  "Vercel",
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_80%_10%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent),radial-gradient(40%_50%_at_0%_100%,color-mix(in_oklch,var(--ring)_14%,transparent),transparent)]"
        />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1.15fr_1fr] md:py-24">
          <div className="flex flex-col gap-6">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" aria-hidden />
              Live demo, no sign-up needed
            </span>
            <h1 className="text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Your closet, <span className="text-primary">styled by AI.</span>
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
              FitCheck AI turns photos of your clothes into a digital wardrobe, then helps you
              build, plan and track outfits from what you already own.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" className="h-11 px-5 text-base" nativeButton={false} render={<Link href="/closet" />}>
                Open TWITOS CLOSET
                <ArrowRight data-icon="inline-end" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-11 px-5 text-base"
                nativeButton={false}
                render={<a href={REPO_URL} target="_blank" rel="noreferrer" />}
              >
                <Code2 data-icon="inline-start" />
                View the code
              </Button>
            </div>
          </div>

          <HeroPreview />
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-24" aria-labelledby="features">
        <div className="mb-10 flex max-w-2xl flex-col gap-3">
          <h2 id="features" className="text-3xl font-bold tracking-tight">
            From photo to outfit in a few taps
          </h2>
          <p className="text-muted-foreground">
            Every feature works on your phone first: capture, tag, style and plan without leaving the app.
          </p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <li
              key={title}
              className="flex flex-col gap-3 rounded-2xl border bg-card p-6 transition-colors duration-200 hover:border-primary/40"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-primary">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Stack + CTA */}
      <section className="border-t bg-muted/50">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-8 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex max-w-xl flex-col gap-4">
            <h2 className="text-2xl font-bold tracking-tight">Built with</h2>
            <ul className="flex flex-wrap gap-2" aria-label="Tech stack">
              {STACK.map((tech) => (
                <li key={tech} className="rounded-full border bg-background px-3 py-1 text-sm">
                  {tech}
                </li>
              ))}
            </ul>
          </div>
          <Button size="lg" className="h-11 px-5 text-base" nativeButton={false} render={<Link href="/closet" />}>
            Try it now
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </section>
    </main>
  );
}

// A static mock of the app (no data fetch), so the landing page stays fully prerendered.
function HeroPreview() {
  const items = [
    { icon: Shirt, label: "Linen shirt", tag: "Shirt · Summer" },
    { icon: Shirt, label: "Wide-leg jeans", tag: "Jeans · All season" },
    { icon: Shirt, label: "White sneakers", tag: "Shoes · Casual" },
  ];

  return (
    <div aria-hidden className="relative mx-auto w-full max-w-sm">
      <div className="rounded-3xl border bg-card p-5 shadow-xl shadow-primary/10">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-heading text-lg font-semibold">Today&apos;s look</p>
          <span className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
            <CloudSun className="size-3.5" />
            24°
          </span>
        </div>
        <ul className="flex flex-col gap-2.5">
          {items.map(({ icon: Icon, label, tag }) => (
            <li key={label} className="flex items-center gap-3 rounded-xl border bg-checkerboard p-2.5">
              <span className="flex size-11 items-center justify-center rounded-lg bg-background text-primary">
                <Icon className="size-5" />
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-medium">{label}</span>
                <span className="text-xs text-muted-foreground">{tag}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-primary px-4 py-3 text-primary-foreground">
          <span className="text-sm font-medium">Match score</span>
          <span className="font-heading text-xl font-bold">92%</span>
        </div>
      </div>
    </div>
  );
}
