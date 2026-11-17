import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).optional(),
  quantityDelta: z.number().int().min(-100000).max(100000).refine(value => value !== 0, "Quantity change cannot be zero."),
  reason: z.enum(["PURCHASE_RECEIVED", "RETURN_RESTOCKED", "DAMAGED", "CORRECTION", "OTHER"]),
  reference: z.string().trim().max(120).optional(),
});

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid stock adjustment.", details: parsed.error.flatten() }, { status: 400 });
  const { productId, variantId, quantityDelta, reason, reference } = parsed.data;
  try {
    const movement = await prisma.$transaction(async tx => {
      const product = await tx.product.findUnique({ where: { id: productId }, select: { id: true, name: true } });
      if (!product) throw new Error("PRODUCT_NOT_FOUND");
      if (variantId) {
        const variant = await tx.productVariant.findFirst({ where: { id: variantId, productId }, select: { id: true } });
        if (!variant) throw new Error("VARIANT_NOT_FOUND");
        const changed = await tx.productVariant.updateMany({
          where: { id: variantId, productId, ...(quantityDelta < 0 ? { inventoryQty: { gte: Math.abs(quantityDelta) } } : {}) },
          data: quantityDelta > 0 ? { inventoryQty: { increment: quantityDelta } } : { inventoryQty: { decrement: Math.abs(quantityDelta) } },
        });
        if (changed.count !== 1) throw new Error("INSUFFICIENT_STOCK");
      } else {
        const changed = await tx.product.updateMany({
          where: { id: productId, ...(quantityDelta < 0 ? { inventoryQty: { gte: Math.abs(quantityDelta) } } : {}) },
          data: quantityDelta > 0 ? { inventoryQty: { increment: quantityDelta } } : { inventoryQty: { decrement: Math.abs(quantityDelta) } },
        });
        if (changed.count !== 1) throw new Error("INSUFFICIENT_STOCK");
      }
      return tx.inventoryMovement.create({
        data: { productId, variantId: variantId ?? null, quantityDelta, reason: "ADMIN_" + reason, reference: reference || null, createdBy: admin.id },
        include: { product: { select: { name: true, sku: true } }, variant: { select: { label: true, sku: true } } },
      });
    });
    return NextResponse.json({ movement }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "PRODUCT_NOT_FOUND") return NextResponse.json({ error: "Product not found." }, { status: 404 });
    if (code === "VARIANT_NOT_FOUND") return NextResponse.json({ error: "The selected variant does not belong to this product." }, { status: 400 });
    if (code === "INSUFFICIENT_STOCK") return NextResponse.json({ error: "This adjustment would make stock negative. Check the current quantity." }, { status: 409 });
    return NextResponse.json({ error: "Stock adjustment could not be saved." }, { status: 500 });
  }
}
