import type { Metadata } from "next";

import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "About",
};

export default function AboutPage() {
  return <LandingPage />;
}
