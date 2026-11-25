import "server-only";

import { cache } from "react";

import { getSessionUserId } from "@/lib/auth";
import { DEMO_CLOSET_IDS } from "@/lib/auth-mode";
import { itemImageUrl } from "@/lib/clothing";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/validations/closet-profile";

// Reads of closets for other people. Only fields meant for visitors are ever selected here:
// never email, wear history, plans or original photos.

// Every public closet, newest first, for the homepage.
export async function listPublicClosets() {
  return prisma.user.findMany({
    where: { visibility: "PUBLIC", closetName: { not: null }, id: { notIn: DEMO_CLOSET_IDS } },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      slug: true,
      closetName: true,
      name: true,
      avatarUrl: true,
      gender: true,
      city: true,
      age: true,
      _count: { select: { clothingItems: true } },
    },
  });
}

// Item counts of the example closets, by user id.
export async function countExampleItems() {
  const rows = await prisma.clothingItem.groupBy({
    by: ["userId"],
    where: { userId: { in: DEMO_CLOSET_IDS } },
    _count: { _all: true },
  });
  return new Map(rows.map((row) => [row.userId, row._count._all]));
}

// A closet by its address, or null when it doesn't exist or is private. Private closets look
// exactly like missing ones to everybody except their owner.
export const getViewableCloset = cache(async (slug: string) => {
  const closet = await prisma.user.findUnique({
    where: { slug },
    select: {
      id: true,
      closetName: true,
      name: true,
      avatarUrl: true,
      gender: true,
      city: true,
      age: true,
      visibility: true,
    },
  });
  if (!closet?.closetName) return null;
  const isOwner = (await getSessionUserId()) === closet.id;
  if (closet.visibility !== "PUBLIC" && !isOwner) return null;
  return { ...closet, closetName: closet.closetName, isOwner };
});

export async function getClosetContents(userId: string) {
  const [items, sections, outfits] = await Promise.all([
    prisma.clothingItem.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        type: true,
        color: true,
        secondaryColor: true,
        season: true,
        style: true,
        imageUrl: true,
        bgRemovedUrl: true,
        framedUrl: true,
        sections: { select: { id: true } },
      },
    }),
    prisma.section.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
    prisma.outfit.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        occasion: true,
        backdrop: true,
        matchScore: true,
        items: {
          select: {
            id: true,
            positionX: true,
            positionY: true,
            scale: true,
            zIndex: true,
            clothingItem: {
              select: { name: true, imageUrl: true, bgRemovedUrl: true, framedUrl: true },
            },
          },
        },
      },
    }),
  ]);

  return {
    items: items.map(({ sections: itemSections, imageUrl, bgRemovedUrl, framedUrl, ...item }) => ({
      ...item,
      image: itemImageUrl({ imageUrl, bgRemovedUrl, framedUrl }),
      sectionIds: itemSections.map((s) => s.id),
    })),
    sections,
    outfits,
  };
}

export type ViewableItem = Awaited<ReturnType<typeof getClosetContents>>["items"][number];

// A free address for a closet name: "twitos-closet", or with a short suffix when it's taken.
export async function uniqueSlug(closetName: string) {
  const base = slugify(closetName);
  const taken = await prisma.user.findUnique({ where: { slug: base }, select: { id: true } });
  return taken ? `${base}-${crypto.randomUUID().slice(0, 6)}` : base;
}
