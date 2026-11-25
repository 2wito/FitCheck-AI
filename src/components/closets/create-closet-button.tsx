import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

// The site's main call to action.
export function CreateClosetButton() {
  return (
    <Button
      className="h-auto min-h-16 w-full rounded-2xl px-6 py-4 font-heading text-lg font-bold tracking-wide whitespace-normal justify-start text-left shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 sm:w-fit sm:px-9 sm:text-2xl"
      nativeButton={false}
      render={<Link href="/create" />}
    >
      CREATE YOUR CLOSET NOW!
      <ArrowRight data-icon="inline-end" className="size-6" />
    </Button>
  );
}
