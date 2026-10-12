"use client";

import { useState } from "react";
import { ImageUp } from "lucide-react";

import { ACCEPTED_IMAGE_TYPES } from "@/lib/clothing";
import { cn } from "@/lib/utils";

// Click-or-drop target for a single image file.
export function ImageDropzone({
  onFile,
  title,
  hint,
  className,
}: {
  onFile: (file: File) => void;
  title: string;
  hint: React.ReactNode;
  className?: string;
}) {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) onFile(file);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors",
        "hover:border-foreground/30 hover:bg-muted/50 has-focus-visible:border-ring has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
        isDragging && "border-foreground/40 bg-muted",
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <ImageUp className="size-6 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <div className="text-muted-foreground">{hint}</div>
      </div>
      <input
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </label>
  );
}
