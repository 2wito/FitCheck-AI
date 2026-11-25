import type { Metadata } from "next";
import {
  CalendarDays,
  Globe,
  KeyRound,
  Palette,
  Pencil,
  ScanLine,
  Shuffle,
  Sparkles,
  Tags,
  Wand2,
} from "lucide-react";

import { CreateClosetButton } from "@/components/closets/create-closet-button";
import { PhotoTips } from "@/components/shared/photo-tips";

export const metadata: Metadata = {
  title: "Guide",
  description: "How to create a closet, get great clothing photos, and use every feature.",
};

const CREATE_STEPS = [
  "Press CREATE YOUR CLOSET NOW!",
  "Give your closet a name, and add your name and a photo if you like.",
  "Choose public or private, then press CREATE MY CLOSET. That's it.",
];

const ACCESS = [
  {
    icon: Globe,
    title: "Public closet",
    body: "Appears on the homepage with your photo and name. Everyone can look at your clothes and outfits, but only you can change them. Your planner and email are never shown.",
  },
  {
    icon: KeyRound,
    title: "Private closet",
    body: "Never listed. You open it with the email and password you chose, with no verification email. Passwords can't be reset by email yet, so keep yours safe. You can make the closet public later in Settings.",
  },
  {
    icon: Pencil,
    title: "Example closets",
    body: "TWITO'S CLOSET and SHAKED'S CLOSET are a playground: everyone can add, edit and delete there. Try things out before opening your own.",
  },
];

const FEATURES = [
  {
    icon: ScanLine,
    title: "Add item",
    body: "In Closet, press Add item and upload a photo, or pick one with Search online. The background is removed on your device, and you can adjust the framing later. On a phone, the camera button adds an item in one tap.",
  },
  {
    icon: Tags,
    title: "AI tags and sections",
    body: "AI recognizes the type, colors, season and style. Fix anything with Edit tags, and group clothes your way with New section (like Elegant or Gym).",
  },
  {
    icon: Sparkles,
    title: "Today's look",
    body: "With at least two items, the top of your closet suggests an outfit for today's weather and occasion. Mark it as worn to keep suggestions fresh.",
  },
  {
    icon: Shuffle,
    title: "Mix & Match",
    body: "Swipe through tops, bottoms and shoes to find combinations, with a live match score.",
  },
  {
    icon: Palette,
    title: "Create an outfit",
    body: "Drag, resize and layer clothes on a canvas, choose a backdrop, undo mistakes, and save or export the look as a picture.",
  },
  {
    icon: Wand2,
    title: "AI stylist and Complete the look",
    body: "Describe the occasion and the stylist builds an outfit from your closet. If something's missing, Complete the look suggests pieces you own or can buy.",
  },
  {
    icon: CalendarDays,
    title: "Planner",
    body: "Plan outfits on a calendar and log what you wore. Your closet then shows how often you wear each piece.",
  },
];

export default function GuidePage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-14 px-4 py-10 sm:px-6 sm:py-16">
      <header className="flex flex-col gap-3">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">How it works</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          From an empty closet to your first outfit, in a few minutes.
        </p>
      </header>

      <Section id="create" title="1. Create your closet">
        <ol className="flex flex-col gap-3">
          {CREATE_STEPS.map((step, i) => (
            <li key={step} className="flex items-start gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {i + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
        <CreateClosetButton />
        <FeatureList items={ACCESS} columns="sm:grid-cols-3" />
      </Section>

      <Section id="photos" title="2. Add great photos">
        <p className="text-muted-foreground">
          A clean picture of one garment makes everything better: the cutout, the tags and the
          outfits.
        </p>
        <PhotoTips />
      </Section>

      <Section id="features" title="3. Use every feature">
        <FeatureList items={FEATURES} columns="sm:grid-cols-2" />
        <p className="text-sm text-muted-foreground">
          To keep the site free, each closet gets 40 AI actions and 20 online searches a day.
        </p>
      </Section>
    </main>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="flex scroll-mt-20 flex-col gap-5" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="text-2xl font-bold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

function FeatureList({
  items,
  columns,
}: {
  items: { icon: typeof Globe; title: string; body: string }[];
  columns: string;
}) {
  return (
    <ul className={`grid gap-4 ${columns}`}>
      {items.map(({ icon: Icon, title, body }) => (
        <li key={title} className="flex flex-col gap-2 rounded-2xl border bg-card p-5">
          <Icon className="size-5 text-primary" aria-hidden />
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
        </li>
      ))}
    </ul>
  );
}
