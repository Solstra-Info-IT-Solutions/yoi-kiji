import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function authorised(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const supplied = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from("Bearer " + secret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function POST(request: NextRequest) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "Cron endpoint is not configured." }, { status: 503 });
  if (!authorised(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const now = new Date();
  const due = await prisma.blogPost.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: now } },
    select: { id: true, scheduledAt: true },
    orderBy: { scheduledAt: "asc" },
    take: 100,
  });

  let published = 0;
  for (const post of due) {
    if (!post.scheduledAt) continue;
    const result = await prisma.blogPost.updateMany({
      where: { id: post.id, status: "SCHEDULED", AND: [{ scheduledAt: post.scheduledAt }, { scheduledAt: { lte: now } }] },
      data: { status: "PUBLISHED", publishedAt: post.scheduledAt },
    });
    published += result.count;
  }

  return NextResponse.json({ published, checked: due.length });
}
