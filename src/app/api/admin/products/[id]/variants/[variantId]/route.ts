import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  sku: z.string().trim().min(2).max(80).optional(),
  label: z.string().trim().min(1).max(240).optional(),
  pricePaise: z.number().int().positive().nullable().optional(),
  inventoryQty: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  swatchHex: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  attributes: z.record(z.string(), z.string()).optional(),
}).strict();

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; variantId: string }> }) {
  const admin = await requireAdmin();
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
  const { id, variantId } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid variant update.", details: parsed.error.flatten() }, { status: 400 });
  try {
    const before = await prisma.productVariant.findFirst({
      where: { id: variantId, productId: id },
      include: { product: { include: { productType: { include: { attributes: { include: { attribute: true } } } } } } },
    });
    if (!before) return NextResponse.json({ error: "Variant not found." }, { status: 404 });
    const attributes = parsed.data.attributes;
    if (attributes) {
      const axes = before.product.productType?.attributes.filter(link => link.attribute.isVariantAxis) ?? [];
      const allowedKeys = new Set(axes.map(axis => axis.attribute.key));
      if (Object.keys(attributes).length !== allowedKeys.size || Object.keys(attributes).some(key => !allowedKeys.has(key))) {
        return NextResponse.json({ error: "Variant attributes must match the configured product-type axes." }, { status: 400 });
      }
      for (const axis of axes) {
        const value = attributes[axis.attribute.key];
        if (!value) return NextResponse.json({ error: `${axis.attribute.name} is required.` }, { status: 400 });
        if (axis.attribute.type === "SELECT" && (!Array.isArray(axis.attribute.options) || !axis.attribute.options.includes(value))) {
          return NextResponse.json({ error: `Choose a valid ${axis.attribute.name} option.` }, { status: 400 });
        }
        if (axis.attribute.type === "NUMBER" && !Number.isFinite(Number(value))) {
          return NextResponse.json({ error: `Enter a valid numeric ${axis.attribute.name}.` }, { status: 400 });
        }
      }
    }
    const variant = await prisma.$transaction(async tx => {
      if (attributes) {
        const axes = before.product.productType?.attributes.filter(link => link.attribute.isVariantAxis) ?? [];
        const existing = await tx.productVariant.findMany({
          where: { productId: id, id: { not: variantId } },
          select: { attributes: true },
        });
        const keyFor = (values: unknown) => {
          if (!values || typeof values !== "object" || Array.isArray(values)) return "";
          const record = values as Record<string, unknown>;
          return axes.map(axis => `${axis.attribute.key}=${String(record[axis.attribute.key] ?? "")}`).join("|");
        };
        const requestedKey = keyFor(attributes);
        if (existing.some(item => keyFor(item.attributes) === requestedKey)) throw new Error("DUPLICATE_VARIANT_COMBINATION");
      }
      const updated = await tx.productVariant.update({
        where: { id: variantId },
        data: {
          ...(parsed.data.sku !== undefined ? { sku: parsed.data.sku } : {}),
          ...(parsed.data.label !== undefined ? { label: parsed.data.label } : {}),
          ...(parsed.data.pricePaise !== undefined ? { pricePaise: parsed.data.pricePaise } : {}),
          ...(parsed.data.inventoryQty !== undefined ? { inventoryQty: parsed.data.inventoryQty } : {}),
          ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
          ...(parsed.data.swatchHex !== undefined ? { swatchHex: parsed.data.swatchHex } : {}),
          ...(attributes !== undefined ? { attributes: attributes as never } : {}),
        },
      });
      if (parsed.data.inventoryQty !== undefined && parsed.data.inventoryQty !== before.inventoryQty) {
        await tx.inventoryMovement.create({
          data: { productId: id, variantId, quantityDelta: parsed.data.inventoryQty - before.inventoryQty, reason: "ADMIN_VARIANT_STOCK_ADJUSTMENT", createdBy: admin.id },
        });
      }
      return updated;
    });
    return NextResponse.json({ variant });
  } catch {
    return NextResponse.json({ error: "Variant could not be updated. Check SKU and label uniqueness." }, { status: 409 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; variantId: string }> }) {
  const admin = await requireAdmin();
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
  const { id, variantId } = await params;
  try {
    const variant = await prisma.$transaction(async tx => {
      const existing = await tx.productVariant.findFirst({ where: { id: variantId, productId: id }, select: { id: true } });
      if (!existing) throw new Error("NOT_FOUND");
      const archived = await tx.productVariant.update({ where: { id: variantId }, data: { isActive: false } });
      const activeCount = await tx.productVariant.count({ where: { productId: id, isActive: true } });
      await tx.product.update({ where: { id }, data: { hasVariants: activeCount > 0 } });
      return archived;
    });
    return NextResponse.json({ variant });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error && error.message === "NOT_FOUND" ? "Variant not found." : "Variant could not be archived." }, { status: error instanceof Error && error.message === "NOT_FOUND" ? 404 : 409 });
  }
}
