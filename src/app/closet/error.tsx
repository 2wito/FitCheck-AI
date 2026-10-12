"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function ClosetError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">We couldn&apos;t load your closet</h1>
      <p className="text-muted-foreground">
        Check your connection and try again. If this keeps happening, the database may be
        unavailable.
      </p>
      <Button onClick={() => retry()}>Try again</Button>
    </main>
  );
}
