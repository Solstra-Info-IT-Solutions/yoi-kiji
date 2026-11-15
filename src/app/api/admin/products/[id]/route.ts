import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  slug: z.string().trim().min(2).max(180).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().min(10).max(10000).optional(),
  sku: z.string().trim().min(2).max(80).optional(),
  hsnCode: z.string().max(20).nullable().optional(),
  material: z.string().max(120).nullable().optional(),
  color: z.string().max(80).nullable().optional(),
  careInstructions: z.string().max(2000).nullable().optional(),
  weightGrams: z.number().int().positive().nullable().optional(),
  lengthMm: z.number().int().positive().nullable().optional(),
  widthMm: z.number().int().positive().nullable().optional(),
  heightMm: z.number().int().positive().nullable().optional(),
  pricePaise: z.number().int().positive().optional(),
  compareAtPaise: z.number().int().positive().nullable().optional(),
  gstRateBps: z.number().int().min(0).max(10000).optional(),
  inventoryQty: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  hasVariants: z.boolean().optional(),
  productTypeId: z.string().min(1).nullable().optional(),
  categoryIds: z.array(z.string().min(1)).min(1).max(50).refine(ids => new Set(ids).size === ids.length, "Category assignments must be unique.").optional(),
  primaryCategoryId: z.string().min(1).optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
}).strict();

function hasValue(value: unknown) {
  return value !== undefined && value !== null && value !== "" && !(Array.isArray(value) && value.length === 0);
}

function validAttributeValue(type: string, value: unknown, options: unknown): boolean {
  if (type === "TEXT") return typeof value === "string";
  if (type === "NUMBER") return typeof value === "number" && Number.isFinite(value);
  if (type === "BOOLEAN") return typeof value === "boolean";
  if (type === "DATE") return typeof value === "string" && !Number.isNaN(Date.parse(value));
  if (type === "SELECT") return typeof value === "string" && Array.isArray(options) && options.includes(value);
  if (type === "MULTI_SELECT") return Array.isArray(value) && value.every(v => typeof v === "string" && Array.isArray(options) && options.includes(v));
  return false;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid product update.", details: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  try {
    const before = await prisma.product.findUnique({ where: { id }, select: { id: true, productTypeId: true, inventoryQty: true } });
    if (!before) return NextResponse.json({ error: "Product not found." }, { status: 404 });

    const nextProductTypeId = data.productTypeId === undefined ? before.productTypeId : data.productTypeId;
    const typeChanged = nextProductTypeId !== before.productTypeId;
    let attributeValues: { attributeId: string; value: unknown }[] | undefined;
    if (data.attributes !== undefined || typeChanged) {
      if (nextProductTypeId) {
        const productType = await prisma.productType.findUnique({
          where: { id: nextProductTypeId },
          include: { attributes: { include: { attribute: true } } },
        });
        if (!productType) return NextResponse.json({ error: "Selected product type does not exist." }, { status: 400 });
        const submitted = data.attributes ?? {};
        const allowedIds = new Set(productType.attributes.map(link => link.attributeId));
        if (Object.keys(submitted).some(attributeId => !allowedIds.has(attributeId))) {
          return NextResponse.json({ error: "One or more specifications do not belong to the selected product type." }, { status: 400 });
        }
        attributeValues = [];
        for (const link of productType.attributes) {
          if (link.attribute.isVariantAxis) continue;
          const value = submitted[link.attributeId];
          if (!hasValue(value)) {
            if (link.isRequired) return NextResponse.json({ error: `${link.attribute.name} is required.` }, { status: 400 });
            continue;
          }
          if (!validAttributeValue(link.attribute.type, value, link.attribute.options)) {
            return NextResponse.json({ error: `Invalid value for ${link.attribute.name}.` }, { status: 400 });
          }
          attributeValues.push({ attributeId: link.attributeId, value });
        }
      } else {
        if (data.attributes && Object.keys(data.attributes).length) {
          return NextResponse.json({ error: "Choose a product type before saving dynamic specifications." }, { status: 400 });
        }
        attributeValues = [];
      }
    }

    let categoryIds = data.categoryIds;
    const primaryCategoryId = data.primaryCategoryId ?? (categoryIds?.[0]);
    if (categoryIds && primaryCategoryId && !categoryIds.includes(primaryCategoryId)) {
      return NextResponse.json({ error: "The primary category must also be selected." }, { status: 400 });
    }
    if (categoryIds) {
      const categories = await prisma.category.findMany({
        where: { id: { in: categoryIds }, isActive: true },
        select: { id: true },
      });
      if (categories.length !== new Set(categoryIds).size) {
        return NextResponse.json({ error: "All selected categories must exist and be active." }, { status: 400 });
      }
    }

    const product = await prisma.$transaction(async tx => {
      const updated = await tx.product.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.slug !== undefined ? { slug: data.slug } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.sku !== undefined ? { sku: data.sku } : {}),
          ...(data.hsnCode !== undefined ? { hsnCode: data.hsnCode } : {}),
          ...(data.material !== undefined ? { material: data.material } : {}),
          ...(data.color !== undefined ? { color: data.color } : {}),
          ...(data.careInstructions !== undefined ? { careInstructions: data.careInstructions } : {}),
          ...(data.weightGrams !== undefined ? { weightGrams: data.weightGrams } : {}),
          ...(data.lengthMm !== undefined ? { lengthMm: data.lengthMm } : {}),
          ...(data.widthMm !== undefined ? { widthMm: data.widthMm } : {}),
          ...(data.heightMm !== undefined ? { heightMm: data.heightMm } : {}),
          ...(data.pricePaise !== undefined ? { pricePaise: data.pricePaise } : {}),
          ...(data.compareAtPaise !== undefined ? { compareAtPaise: data.compareAtPaise } : {}),
          ...(data.gstRateBps !== undefined ? { gstRateBps: data.gstRateBps } : {}),
          ...(data.inventoryQty !== undefined ? { inventoryQty: data.inventoryQty } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
          ...(data.hasVariants !== undefined ? { hasVariants: data.hasVariants } : {}),
          ...(data.productTypeId !== undefined ? { productTypeId: data.productTypeId } : {}),
          ...(categoryIds ? { categoryId: primaryCategoryId } : {}),
        },
      });

      if (categoryIds) {
        await tx.productCategory.deleteMany({ where: { productId: id } });
        await tx.productCategory.createMany({
          data: categoryIds.map(categoryId => ({ productId: id, categoryId, isPrimary: categoryId === primaryCategoryId })),
        });
      }
      if (attributeValues !== undefined) {
        await tx.productAttributeValue.deleteMany({ where: { productId: id } });
        if (attributeValues.length) {
          await tx.productAttributeValue.createMany({
            data: attributeValues.map(item => ({ productId: id, attributeId: item.attributeId, value: item.value as never })),
          });
        }
      }
      if (data.inventoryQty !== undefined && data.inventoryQty !== before.inventoryQty) {
        await tx.inventoryMovement.create({
          data: { productId: id, quantityDelta: data.inventoryQty - before.inventoryQty, reason: "ADMIN_STOCK_ADJUSTMENT", createdBy: admin.id },
        });
      }
      return updated;
    });
    return NextResponse.json({ product });
  } catch {
    return NextResponse.json({ error: "Product could not be updated. Check for duplicate slug or SKU and existing order references." }, { status: 409 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
  const { id } = await params;
  try {
    const product = await prisma.product.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ product });
  } catch {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }
}
