import { Camera, Search } from "lucide-react";

// Where good clothing photos come from, shown in the guide, on the homepage and in an empty
// closet. Order matters: the first one gives the best results.
export function PhotoTips() {
  return (
    <ol className="grid gap-3 sm:grid-cols-2">
      <Tip icon={Search} label="Best" title="Find it on Google Images">
        Search for the item, and save a clear picture of the garment alone, with no model and
        nothing else in the frame. Then upload it, or use the &ldquo;Search online&rdquo; tab.
      </Tip>
      <Tip icon={Camera} label="Can't find it?" title="Photograph it on white">
        Lay the garment alone on a plain white background, in good light, and shoot it straight from
        above.
      </Tip>
    </ol>
  );
}

function Tip({
  icon: Icon,
  label,
  title,
  children,
}: {
  icon: typeof Search;
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3 rounded-2xl border bg-card p-4 text-left">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-primary">{label}</span>
        <span className="font-semibold">{title}</span>
        <span className="text-sm leading-relaxed text-muted-foreground">{children}</span>
      </span>
    </li>
  );
}
