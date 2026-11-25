import Link from "next/link";
import { connection } from "next/server";
import { Eye, Pencil } from "lucide-react";

import { Details } from "@/components/closets/details";
import { ClosetAvatar, genderKey } from "@/components/shared/closet-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { DEMO_CLOSETS, DEMO_CLOSET_KEYS } from "@/lib/auth-mode";
import { countExampleItems, listPublicClosets } from "@/lib/closets";

const GRID = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";
const CARD =
  "flex h-full items-center gap-4 rounded-3xl border bg-card p-5 transition-all duration-200 outline-none hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 focus-visible:ring-3 focus-visible:ring-ring/50";

const itemCount = (count: number) => `${count} ${count === 1 ? "item" : "items"}`;

async function loadGallery() {
  try {
    const [closets, exampleCounts] = await Promise.all([listPublicClosets(), countExampleItems()]);
    return { closets, exampleCounts };
  } catch (error) {
    // The homepage should still work when the database doesn't.
    console.error("Failed to load the closet gallery", error);
    return { closets: [], exampleCounts: new Map<string, number>() };
  }
}

// The homepage list: the two example closets, then every public closet, newest first.
export async function ClosetGallery() {
  await connection();
  const { closets, exampleCounts } = await loadGallery();

  return (
    <ul className={GRID}>
      {DEMO_CLOSET_KEYS.map((key) => {
        const { id, name, owner, avatarUrl, gender } = DEMO_CLOSETS[key];
        return (
          <li key={key}>
            {/* Plain link (full page load): the route sets the closet cookie first. */}
            <a href={`/closets/${key}`} className={CARD}>
              <ClosetAvatar
                src={avatarUrl}
                name={owner}
                gender={gender}
                className="size-16 text-xl"
              />
              <CardText
                closetName={name}
                owner={owner}
                details={[itemCount(exampleCounts.get(id) ?? 0)]}
              >
                <Pencil className="size-3" aria-hidden />
                Example closet · everyone can edit
              </CardText>
            </a>
          </li>
        );
      })}
      {closets.map((closet) => (
        <li key={closet.slug}>
          <Link href={`/c/${closet.slug}`} className={CARD}>
            <ClosetAvatar
              src={closet.avatarUrl}
              name={closet.name ?? closet.closetName ?? ""}
              gender={genderKey(closet.gender)}
              className="size-16 text-xl"
            />
            <CardText
              closetName={closet.closetName ?? ""}
              owner={closet.name ?? ""}
              details={[closet.age, closet.city, itemCount(closet._count.clothingItems)]}
            >
              <Eye className="size-3" aria-hidden />
              View only
            </CardText>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function CardText({
  closetName,
  owner,
  details,
  children,
}: {
  closetName: string;
  owner: string;
  details: (string | number | null)[];
  children: React.ReactNode;
}) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="truncate font-heading text-lg font-bold tracking-tight">
        <bdi>{closetName}</bdi>
      </span>
      <span className="truncate text-sm font-medium">
        <bdi>{owner}</bdi>
      </span>
      <span className="truncate text-xs text-muted-foreground">
        <Details parts={details} />
      </span>
      <span className="mt-1 flex w-fit items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
        {children}
      </span>
    </span>
  );
}

export function ClosetGallerySkeleton() {
  return (
    <div className={GRID}>
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-32 rounded-3xl" />
      ))}
    </div>
  );
}
