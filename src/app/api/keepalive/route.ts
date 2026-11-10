import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

// Hit daily by a Vercel Cron Job (see vercel.json) so the free-tier Supabase project
// never sees 7 idle days and gets paused.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const users = await prisma.user.count();
    return NextResponse.json({ ok: true, users, at: new Date().toISOString() });
  } catch (error) {
    console.error("[FitCheck AI] keepalive query failed", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
