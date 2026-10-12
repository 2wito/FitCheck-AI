"use client";

import { PageError } from "@/components/shared/page-error";

export default function ProfileError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <PageError title="We couldn't load your profile" {...props} />;
}
