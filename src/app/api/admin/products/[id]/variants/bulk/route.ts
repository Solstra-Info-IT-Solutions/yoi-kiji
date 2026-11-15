import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const variantSchema = z.object({
  sku: z.string().trim().min(2).max(80),
  label: z.string().trim().min(1).max(240),
  pricePaise: z.number().int().positive().optional(),
  inventoryQty: z.number().int().min(0).default(0),
  attributes: z.record(z.string(), z.string()),
});
const schema = z.object({ variants: z.array(variantSchema).min(1).max(250) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid variant matrix.", details: parsed.error.flatten() }, { status: 400 });
  const product = await prisma.product.findUnique({
    where: { id },
    include: { productType: { include: { attributes: { include: { attribute: true }, orderBy: { sortOrder: "asc" } } } } },
  });
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
  const axes = product.productType?.attributes.filter(link => link.attribute.isVariantAxis) ?? [];
  if (!axes.length) return NextResponse.json({ error: "Configure at least one variant axis on this product type first." }, { status: 400 });

  const allowedKeys = new Set(axes.map(axis => axis.attribute.key));
  const seenLabels = new Set<string>();
  const seenSkus = new Set<string>();
  const seenCombinations = new Set<string>();
  for (const variant of parsed.data.variants) {
    const keys = Object.keys(variant.attributes);
    if (keys.length !== allowedKeys.size || keys.some(key => !allowedKeys.has(key))) {
      return NextResponse.json({ error: "Every variant must contain exactly the configured variant axes." }, { status: 400 });
    }
    for (const axis of axes) {
      const value = variant.attributes[axis.attribute.key];
      if (!value) return NextResponse.json({ error: `${axis.attribute.name} is required for every SKU.` }, { status: 400 });
      if (axis.attribute.type === "SELECT" && (!Array.isArray(axis.attribute.options) || !axis.attribute.options.includes(value))) {
        return NextResponse.json({ error: `Choose a valid ${axis.attribute.name} option.` }, { status: 400 });
      }
      if (axis.attribute.type === "NUMBER" && !Number.isFinite(Number(value))) {
        return NextResponse.json({ error: `Enter a valid numeric ${axis.attribute.name}.` }, { status: 400 });
      }
    }
    const normalizedLabel = variant.label.trim().toLowerCase();
    const normalizedSku = variant.sku.trim().toLowerCase();
    if (seenLabels.has(normalizedLabel) || seenSkus.has(normalizedSku)) {
      return NextResponse.json({ error: "The matrix contains duplicate labels or SKUs." }, { status: 400 });
    }
    const combinationKey = axes.map(axis => `${axis.attribute.key}=${variant.attributes[axis.attribute.key]}`).join("|");
    if (seenCombinations.has(combinationKey)) {
      return NextResponse.json({ error: "The matrix contains duplicate option combinations." }, { status: 400 });
    }
    seenCombinations.add(combinationKey);
    seenLabels.add(normalizedLabel);
    seenSkus.add(normalizedSku);
  }

  try {
    const created = await prisma.$transaction(async tx => {
      const existing = await tx.productVariant.findMany({ where: { productId: id }, select: { label: true, attributes: true } });
      const existingLabels = new Set(existing.map(variant => variant.label.trim().toLowerCase()));
      const keyFor = (attributes: unknown) => {
        if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) return "";
        const values = attributes as Record<string, unknown>;
        return axes.map(axis => `${axis.attribute.key}=${String(values[axis.attribute.key] ?? "")}`).join("|");
      };
      const existingCombinations = new Set(existing.map(variant => keyFor(variant.attributes)));
      if (parsed.data.variants.some(variant => existingLabels.has(variant.label.trim().toLowerCase()))) {
        throw new Error("DUPLICATE_VARIANT_LABEL");
      }
      if (parsed.data.variants.some(variant => existingCombinations.has(keyFor(variant.attributes)))) {
        throw new Error("DUPLICATE_VARIANT_COMBINATION");
      }
      await tx.productVariant.createMany({
        data: parsed.data.variants.map(variant => ({
          productId: id, sku: variant.sku, label: variant.label,
          pricePaise: variant.pricePaise, inventoryQty: variant.inventoryQty,
          isActive: true, attributes: variant.attributes as never,
        })),
      });
      const variants = await tx.productVariant.findMany({
        where: { productId: id, sku: { in: parsed.data.variants.map(variant => variant.sku) } },
        orderBy: { label: "asc" },
      });
      const movements = variants.filter(variant => variant.inventoryQty > 0).map(variant => ({
        productId: id, variantId: variant.id, quantityDelta: variant.inventoryQty,
        reason: "VARIANT_INITIAL_STOCK", createdBy: admin.id,
      }));
      if (movements.length) await tx.inventoryMovement.createMany({ data: movements });
      await tx.product.update({ where: { id }, data: { hasVariants: true } });
      return variants;
    });
    return NextResponse.json({ variants: created, createdCount: created.length }, { status: 201 });
  } catch (error) {
    const duplicate = error instanceof Error && error.message === "DUPLICATE_VARIANT_LABEL";
    return NextResponse.json({ error: duplicate ? "One or more option combinations already exist." : "Variant matrix could not be created. Check SKU and label uniqueness." }, { status: 409 });
  }
}
