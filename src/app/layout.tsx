import type { Metadata, Viewport } from "next";
import { Manrope, Syne } from "next/font/google";
import { SiteHeader } from "@/components/layout/site-header";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

// Syne (display) + Manrope (body): a fashion-forward pairing with a readable body face.
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const syne = Syne({ variable: "--font-syne", subsets: ["latin"], weight: ["600", "700"] });

export const metadata: Metadata = {
  title: { default: "FitCheck AI", template: "%s | FitCheck AI" },
  description:
    "A smart virtual closet: background removal in the browser, AI clothing tags, and AI-styled outfits.",
};

// viewport-fit=cover lets content use the full screen on notched phones; the layout then
// pads with env(safe-area-inset-*) so nothing sits under the notch or home indicator.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfdfd" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${manrope.variable} ${syne.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col overflow-x-clip pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
        <SiteHeader />
        {/* Bottom padding keeps content clear of the phone tab bar. */}
        <div className="flex flex-1 flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </div>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
