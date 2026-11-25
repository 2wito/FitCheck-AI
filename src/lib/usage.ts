import "server-only";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";

import { prisma } from "@/lib/prisma";
import { getServiceRoleKey } from "@/lib/supabase/config";

// Daily limits, so an open site can't run through the AI and search quotas or be flooded
// with closets. Counted per closet (or per visitor) and reset at midnight UTC.
const DAILY_LIMITS = { ai: 40, search: 20, "new-closet": 5 } as const;

export const AI_LIMIT_MESSAGE =
  "This closet has used its AI for today. It resets at midnight UTC; everything else still works.";
export const SEARCH_LIMIT_MESSAGE =
  "This closet has used its online searches for today. You can still upload photos.";

// Counts one use and returns whether it's within today's limit. A single statement, so
// parallel requests can't slip past the limit.
export async function consumeUsage(kind: keyof typeof DAILY_LIMITS, subject: string) {
  const day = new Date().toISOString().slice(0, 10);
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "usage_counters" ("key", "day", "count")
    VALUES (${`${kind}:${subject}`}, ${day}::date, 1)
    ON CONFLICT ("key", "day") DO UPDATE SET "count" = "usage_counters"."count" + 1
    WHERE "usage_counters"."count" < ${DAILY_LIMITS[kind]}
    RETURNING "count"`;
  return rows.length > 0;
}

// Identifies a visitor without storing their IP address: only a keyed hash is kept.
export async function visitorKey() {
  const h = await headers();
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return createHmac("sha256", getServiceRoleKey()).update(ip).digest("hex").slice(0, 32);
}
