import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const categorySchema = z.object({ name: z.string().trim().min(2).max(80), slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), description: z.string().max(500).optional().nullable() });
const tagSchema = z.object({ name: z.string().trim().min(2).max(60), slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) });

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || !["category", "tag"].includes(body.type)) return NextResponse.json({ error: "Choose category or tag." }, { status: 400 });
  const parsed = body.type === "category" ? categorySchema.safeParse(body.data) : tagSchema.safeParse(body.data);
  if (!parsed.success) return NextResponse.json({ error: "Invalid blog taxonomy details.", details: parsed.error.flatten() }, { status: 400 });
  try {
    const item = body.type === "category"
      ? await prisma.blogCategory.create({ data: parsed.data })
      : await prisma.blogTag.create({ data: parsed.data });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string })?.code === "P2002") return NextResponse.json({ error: "That slug is already in use." }, { status: 409 });
    throw error;
  }
}
