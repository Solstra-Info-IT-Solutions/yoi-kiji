import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  url: z.string().url().refine(value => value.startsWith("https://"), "Image URLs must use HTTPS."),
  alt: z.string().trim().min(3).max(200),
  variantId: z.string().min(1).nullable().optional(),
  isPrimary: z.boolean().optional(),
});
const updateSchema = z.object({
  imageId: z.string().min(1),
  alt: z.string().trim().min(3).max(200).optional(),
  variantId: z.string().min(1).nullable().optional(),
  isPrimary: z.boolean().optional(),
  position: z.number().int().min(0).max(500).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
  const { id } = await params;
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid HTTPS image URL and descriptive alt text.", details: parsed.error.flatten() }, { status: 400 });

  try {
    const image = await prisma.$transaction(async tx => {
      const product = await tx.product.findUnique({ where: { id }, select: { id: true } });
      if (!product) throw new Error("PRODUCT_NOT_FOUND");
      const variantId = parsed.data.variantId ?? null;
      if (variantId) {
        const variant = await tx.productVariant.findFirst({ where: { id: variantId, productId: id }, select: { id: true } });
        if (!variant) throw new Error("VARIANT_NOT_FOUND");
      }
      const scope = { productId: id, variantId };
      const existing = await tx.productImage.count({ where: scope });
      const isPrimary = parsed.data.isPrimary ?? existing === 0;
      if (isPrimary) await tx.productImage.updateMany({ where: scope, data: { isPrimary: false } });
      return tx.productImage.create({
        data: { ...scope, url: parsed.data.url, alt: parsed.data.alt, position: existing, isPrimary },
      });
    });
    return NextResponse.json({ image }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "PRODUCT_NOT_FOUND") return NextResponse.json({ error: "Product not found." }, { status: 404 });
    if (code === "VARIANT_NOT_FOUND") return NextResponse.json({ error: "The selected SKU does not belong to this product." }, { status: 400 });
    return NextResponse.json({ error: "Product image could not be added." }, { status: 409 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid image update.", details: parsed.error.flatten() }, { status: 400 });
  try {
    const image = await prisma.$transaction(async tx => {
      const current = await tx.productImage.findFirst({ where: { id: parsed.data.imageId, productId: id } });
      if (!current) throw new Error("IMAGE_NOT_FOUND");
      const nextVariantId = parsed.data.variantId === undefined ? current.variantId : parsed.data.variantId;
      if (nextVariantId) {
        const variant = await tx.productVariant.findFirst({ where: { id: nextVariantId, productId: id }, select: { id: true } });
        if (!variant) throw new Error("VARIANT_NOT_FOUND");
      }
      const scopeChanged = nextVariantId !== current.variantId;
      const nextScope = { productId: id, variantId: nextVariantId };
      const count = await tx.productImage.count({ where: nextScope });
      const shouldBePrimary = parsed.data.isPrimary ?? (scopeChanged && count === 0 ? true : current.isPrimary);
      if (shouldBePrimary) await tx.productImage.updateMany({
        where: { ...nextScope, id: { not: current.id } }, data: { isPrimary: false },
      });
      if (scopeChanged && current.isPrimary) {
        const sibling = await tx.productImage.findFirst({
          where: { productId: id, variantId: current.variantId, id: { not: current.id } },
          orderBy: [{ position: "asc" }, { id: "asc" }],
        });
        if (sibling) await tx.productImage.update({ where: { id: sibling.id }, data: { isPrimary: true } });
      }
      return tx.productImage.update({
        where: { id: current.id },
        data: {
          ...(parsed.data.alt !== undefined ? { alt: parsed.data.alt } : {}),
          ...(scopeChanged ? { variantId: nextVariantId, position: count } : {}),
          ...(parsed.data.position !== undefined ? { position: parsed.data.position } : {}),
          isPrimary: shouldBePrimary,
        },
      });
    });
    return NextResponse.json({ image });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: code === "IMAGE_NOT_FOUND" ? "Image not found." : code === "VARIANT_NOT_FOUND" ? "The selected SKU does not belong to this product." : "Image could not be updated." }, { status: code === "IMAGE_NOT_FOUND" ? 404 : 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
  const { id } = await params;
  const parsed = z.object({ imageId: z.string().min(1) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid image." }, { status: 400 });
  try {
    const result = await prisma.$transaction(async tx => {
      const image = await tx.productImage.findFirst({ where: { id: parsed.data.imageId, productId: id } });
      if (!image) throw new Error("IMAGE_NOT_FOUND");
      await tx.productImage.delete({ where: { id: image.id } });
      if (image.isPrimary) {
        const next = await tx.productImage.findFirst({
          where: { productId: id, variantId: image.variantId },
          orderBy: [{ position: "asc" }, { id: "asc" }],
        });
        if (next) await tx.productImage.update({ where: { id: next.id }, data: { isPrimary: true } });
      }
      return { deleted: true };
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error && error.message === "IMAGE_NOT_FOUND" ? "Image not found." : "Image could not be removed." }, { status: error instanceof Error && error.message === "IMAGE_NOT_FOUND" ? 404 : 409 });
  }
}
