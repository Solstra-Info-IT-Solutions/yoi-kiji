import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  sku: z.string().trim().min(2).max(80),
  label: z.string().trim().min(1).max(240),
  pricePaise: z.number().int().positive().optional(),
  inventoryQty: z.number().int().min(0),
  isActive: z.boolean().default(true),
  attributes: z.record(z.string(), z.string()).optional().default({}),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid variant.", details: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { productType: { include: { attributes: { include: { attribute: true } } } } },
  });
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
  const axes = product.productType?.attributes.filter(link => link.attribute.isVariantAxis) ?? [];
  if (axes.length) {
    const allowedKeys = new Set(axes.map(axis => axis.attribute.key));
    const unknownKeys = Object.keys(data.attributes).filter(key => !allowedKeys.has(key));
    if (unknownKeys.length) return NextResponse.json({ error: "Variant contains an option not configured for this product type." }, { status: 400 });
    for (const axis of axes) {
      const value = data.attributes[axis.attribute.key];
      if (!value) return NextResponse.json({ error: `${axis.attribute.name} is required for this SKU.` }, { status: 400 });
      if (axis.attribute.type === "SELECT" && (!Array.isArray(axis.attribute.options) || !axis.attribute.options.includes(value))) {
        return NextResponse.json({ error: `Choose a valid ${axis.attribute.name} option.` }, { status: 400 });
      }
      if (axis.attribute.type === "NUMBER" && !Number.isFinite(Number(value))) {
        return NextResponse.json({ error: `Enter a valid numeric ${axis.attribute.name}.` }, { status: 400 });
      }
    }
  } else if (Object.keys(data.attributes).length) {
    return NextResponse.json({ error: "This product type has no configured variant axes." }, { status: 400 });
  }
  try {
    const variant = await prisma.$transaction(async tx => {
      const created = await tx.productVariant.create({ data: { ...data, productId: id, attributes: data.attributes } });
      await tx.product.update({ where: { id }, data: { hasVariants: true } });
      if (data.inventoryQty > 0) await tx.inventoryMovement.create({
        data: { productId: id, variantId: created.id, quantityDelta: data.inventoryQty, reason: "VARIANT_INITIAL_STOCK", createdBy: admin.id },
      });
      return created;
    });
    return NextResponse.json({ variant }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Variant could not be created. Check SKU and option combination uniqueness." }, { status: 409 });
  }
}
