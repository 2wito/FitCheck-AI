"use client";

import { PageError } from "@/components/shared/page-error";

export default function ClosetError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <PageError title="We couldn't load your closet" {...props} />;
}
