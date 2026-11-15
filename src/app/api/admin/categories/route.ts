import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().max(2000).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  parentId: z.string().optional().nullable(),
  sortOrder: z.number().int().min(0).max(10000).default(0),
  showInMenu: z.boolean().default(true),
  seoTitle: z.string().max(160).optional().nullable(),
  seoDescription: z.string().max(320).optional().nullable(),
});
const updateSchema = createSchema.partial().extend({
  id: z.string().min(1),
  isActive: z.boolean().optional(),
});

async function authorised() {
  const admin = await requireAdmin();
  return admin?.role === "ADMIN" ? admin : null;
}

export async function GET() {
  const admin = await authorised();
  if (!admin) return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
  const categories = await prisma.category.findMany({
    include: { _count: { select: { children: true, products: true, productLinks: true } } },
    orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ categories });
}

export async function POST(request: NextRequest) {
  const admin = await authorised();
  if (!admin) return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid category data.", details: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;
  if (data.parentId) {
    const parent = await prisma.category.findUnique({ where: { id: data.parentId }, select: { id: true, isActive: true } });
    if (!parent || !parent.isActive) return NextResponse.json({ error: "Choose an existing active parent category." }, { status: 400 });
  }
  try {
    const category = await prisma.category.create({ data });
    return NextResponse.json({ category }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Category slug already exists or the category could not be created." }, { status: 409 });
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await authorised();
  if (!admin) return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid category data.", details: parsed.error.flatten() }, { status: 400 });
  const { id, ...data } = parsed.data;
  const current = await prisma.category.findUnique({ where: { id }, select: { id: true } });
  if (!current) return NextResponse.json({ error: "Category not found." }, { status: 404 });
  if (data.parentId !== undefined && data.parentId !== null) {
    if (data.parentId === id) return NextResponse.json({ error: "A category cannot be its own parent." }, { status: 400 });
    let cursor: string | null = data.parentId;
    const visited = new Set<string>();
    while (cursor) {
      if (cursor === id) return NextResponse.json({ error: "Moving this category would create a hierarchy cycle." }, { status: 400 });
      if (visited.has(cursor)) return NextResponse.json({ error: "The existing category hierarchy contains a cycle. Repair it before moving categories." }, { status: 409 });
      visited.add(cursor);
      const node: { parentId: string | null } | null = await prisma.category.findUnique({ where: { id: cursor }, select: { parentId: true } });
      if (!node) return NextResponse.json({ error: "Parent category not found." }, { status: 400 });
      cursor = node.parentId;
    }
  }
  try {
    const category = await prisma.category.update({ where: { id }, data });
    return NextResponse.json({ category });
  } catch {
    return NextResponse.json({ error: "Category could not be updated. Check slug uniqueness and parent selection." }, { status: 409 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await authorised();
  if (!admin) return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Category id is required." }, { status: 400 });
  const category = await prisma.category.findUnique({ where: { id }, include: { _count: { select: { children: true, products: true, productLinks: true } } } });
  if (!category) return NextResponse.json({ error: "Category not found." }, { status: 404 });
  // Soft-deactivate instead of deleting records referenced by products or nested categories.
  const updated = await prisma.category.update({ where: { id }, data: { isActive: false, showInMenu: false } });
  return NextResponse.json({ category: updated, retainedReferences: category._count });
}
