import Image from "next/image";

import { itemBoxStyle } from "@/lib/outfit-layout";
import { cn } from "@/lib/utils";
import type { OutfitWithItems } from "@/types";

// Read-only render of a saved outfit, using the same geometry as the editable canvas.
export function OutfitPreview({
  items,
  className,
}: {
  items: OutfitWithItems["items"];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative aspect-[3/4] overflow-hidden rounded-xl bg-muted/60 ring-1 ring-foreground/5",
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.id} className="absolute" style={itemBoxStyle(item)}>
          <Image
            src={item.clothingItem.bgRemovedUrl ?? item.clothingItem.imageUrl}
            alt={item.clothingItem.name}
            fill
            sizes="(min-width: 1024px) 15vw, 40vw"
            className="object-contain"
          />
        </div>
      ))}
    </div>
  );
}
