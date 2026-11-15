import type { Metadata } from "next";

import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: { absolute: "FitCheck AI: your closet, styled by AI" },
};

export default function Home() {
  return <LandingPage />;
}
