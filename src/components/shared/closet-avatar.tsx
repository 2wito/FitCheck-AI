import { CLOSET_THEME } from "@/components/shared/closet-icons";
import { cn } from "@/lib/utils";

// A closet's round photo; without one, its man/woman figure or the name's first letter.
export function ClosetAvatar({
  src,
  name,
  gender,
  className,
}: {
  src: string | null;
  name: string;
  gender?: "male" | "female" | null;
  className?: string;
}) {
  const theme = gender ? CLOSET_THEME[gender] : null;
  return (
    <span
      className={cn(
        "flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent font-heading font-bold text-primary",
        !src && theme?.selected,
        className,
      )}
    >
      {src ? (
        // Already small, and may be hosted by the sign-in provider, so next/image doesn't apply.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="size-full object-cover"
        />
      ) : theme ? (
        <theme.Icon className="size-3/5" />
      ) : (
        <span aria-hidden>{[...name.trim()][0]?.toUpperCase() ?? "?"}</span>
      )}
    </span>
  );
}

// Database gender -> the theme's key.
export function genderKey(gender: "MALE" | "FEMALE" | null) {
  return gender === "MALE" ? "male" : gender === "FEMALE" ? "female" : null;
}
