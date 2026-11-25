import type { SVGProps } from "react";

// Restroom-sign style figures for closets without a photo. Filled with currentColor, so the
// parent sets the color (blue for men, pink for women).

export function ManIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <circle cx="12" cy="3.5" r="2.5" />
      <rect x="9" y="7" width="6" height="9" rx="1.5" />
      <rect x="6.5" y="7.5" width="2" height="8" rx="1" />
      <rect x="15.5" y="7.5" width="2" height="8" rx="1" />
      <rect x="9" y="13" width="2.75" height="9.5" rx="1.25" />
      <rect x="12.25" y="13" width="2.75" height="9.5" rx="1.25" />
    </svg>
  );
}

export function WomanIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <circle cx="12" cy="3.5" r="2.5" />
      <path d="M10 7h4a1.5 1.5 0 0 1 1.44 1.08l2.03 6.6a1 1 0 0 1-1.92.56L14 10.5l2.5 7.5h-2.25V22a1.1 1.1 0 0 1-2.2 0v-4h-.1v4a1.1 1.1 0 0 1-2.2 0v-4H7.5l2.5-7.5-1.55 4.74a1 1 0 0 1-1.92-.56l2.03-6.6A1.5 1.5 0 0 1 10 7Z" />
    </svg>
  );
}

export const CLOSET_THEME = {
  male: {
    Icon: ManIcon,
    // Unselected icon color / selected pill / landing button.
    icon: "text-sky-600 dark:text-sky-400",
    selected: "bg-sky-600 text-white",
    button: "bg-sky-600 text-white hover:bg-sky-700",
  },
  female: {
    Icon: WomanIcon,
    icon: "text-pink-600 dark:text-pink-400",
    selected: "bg-pink-600 text-white",
    button: "bg-pink-600 text-white hover:bg-pink-700",
  },
} as const;
