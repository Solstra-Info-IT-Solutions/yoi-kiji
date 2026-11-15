import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().min(2).max(180).regex(/^[a-z0-9-]+$/),
  description: z.string().min(10).max(10000),
  sku: z.string().trim().min(2).max(80),
  hsnCode: z.string().max(20).optional(),
  material: z.string().max(120).optional(),
  color: z.string().max(80).optional(),
  careInstructions: z.string().max(2000).optional(),
  weightGrams: z.number().int().positive().optional(),
  lengthMm: z.number().int().positive().optional(),
  widthMm: z.number().int().positive().optional(),
  heightMm: z.number().int().positive().optional(),
  pricePaise: z.number().int().positive(),
  compareAtPaise: z.number().int().positive().optional(),
  gstRateBps: z.number().int().min(0).max(10000).default(0),
  inventoryQty: z.number().int().min(0),
  categoryId: z.string().min(1),
  isActive: z.boolean().default(false),
  hasVariants: z.boolean().default(false),
  imageUrl: z.string().url().optional(),
  imageAlt: z.string().max(200).optional(),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const products = await prisma.product.findMany({
    include: { category: true, categoryLinks: { include: { category: true } }, images: true, variants: true, productType: true },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ products });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (admin.role !== "ADMIN") return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid product data.", details: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;
  const category = await prisma.category.findUnique({ where: { id: data.categoryId }, select: { id: true, isActive: true } });
  if (!category || !category.isActive) return NextResponse.json({ error: "Choose an existing active category." }, { status: 400 });
  try {
    const product = await prisma.$transaction(async tx => {
      const created = await tx.product.create({
        data: {
          name: data.name, slug: data.slug, description: data.description, sku: data.sku,
          hsnCode: data.hsnCode, material: data.material, color: data.color,
          careInstructions: data.careInstructions, weightGrams: data.weightGrams,
          lengthMm: data.lengthMm, widthMm: data.widthMm, heightMm: data.heightMm,
          pricePaise: data.pricePaise, compareAtPaise: data.compareAtPaise,
          gstRateBps: data.gstRateBps, inventoryQty: data.inventoryQty,
          categoryId: category.id, isActive: data.isActive, hasVariants: data.hasVariants,
          categoryLinks: { create: { categoryId: category.id, isPrimary: true } },
          images: data.imageUrl ? { create: { url: data.imageUrl, alt: data.imageAlt ?? data.name } } : undefined,
        },
      });
      if (data.inventoryQty > 0) await tx.inventoryMovement.create({
        data: { productId: created.id, quantityDelta: data.inventoryQty, reason: "PRODUCT_INITIAL_STOCK", createdBy: admin.id },
      });
      return created;
    });
    return NextResponse.json({ product }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Product could not be created. Check for duplicate slug or SKU." }, { status: 409 });
  }
}
