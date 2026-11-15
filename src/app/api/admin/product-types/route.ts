import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const attributeSchema = z.object({
  name: z.string().trim().min(2).max(100),
  key: z.string().trim().min(2).max(100).regex(/^[a-z][a-z0-9_]*$/),
  type: z.enum(["TEXT", "NUMBER", "BOOLEAN", "SELECT", "MULTI_SELECT", "DATE"]),
  unit: z.string().max(30).optional().nullable(),
  options: z.array(z.string().trim().min(1).max(100)).max(100).optional(),
  required: z.boolean().default(false),
  filterable: z.boolean().default(false),
  variantAxis: z.boolean().default(false),
});
const schema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().max(2000).optional().nullable(),
  attributes: z.array(attributeSchema).max(80).default([]),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
  const productTypes = await prisma.productType.findMany({
    include: { attributes: { include: { attribute: true }, orderBy: { sortOrder: "asc" } }, _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ productTypes });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid product type.", details: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;
  const duplicateKeys = data.attributes.map(a => a.key).filter((key, index, all) => all.indexOf(key) !== index);
  if (duplicateKeys.length) return NextResponse.json({ error: `Duplicate attribute keys: ${[...new Set(duplicateKeys)].join(", ")}` }, { status: 400 });
  const invalidOptions = data.attributes.find(attribute =>
    (attribute.type === "SELECT" || attribute.type === "MULTI_SELECT") && (!attribute.options || attribute.options.length === 0)
  );
  if (invalidOptions) return NextResponse.json({ error: `${invalidOptions.name} needs at least one allowed option.` }, { status: 400 });
  const unsupportedAxis = data.attributes.find(attribute =>
    attribute.variantAxis && !["TEXT", "NUMBER", "SELECT"].includes(attribute.type)
  );
  if (unsupportedAxis) return NextResponse.json({ error: `Variant axis ${unsupportedAxis.name} must use TEXT, NUMBER or SELECT.` }, { status: 400 });
  const existingDefinitions = await prisma.attributeDefinition.findMany({
    where: { key: { in: data.attributes.map(attribute => attribute.key) } },
  });
  const existingByKey = new Map(existingDefinitions.map(attribute => [attribute.key, attribute]));
  const conflictingAttribute = data.attributes.find(item => {
    const existing = existingByKey.get(item.key);
    if (!existing) return false;
    return existing.name !== item.name || existing.type !== item.type ||
      existing.unit !== (item.unit ?? null) ||
      existing.isFilterable !== item.filterable ||
      existing.isVariantAxis !== item.variantAxis ||
      JSON.stringify(existing.options ?? null) !== JSON.stringify(item.options ?? null);
  });
  if (conflictingAttribute) {
    return NextResponse.json({ error: `Attribute key "${conflictingAttribute.key}" already exists with a different shared definition. Use a new key or match its existing definition.` }, { status: 409 });
  }
  try {
    const productType = await prisma.$transaction(async tx => {
      const created = await tx.productType.create({ data: { name: data.name, slug: data.slug, description: data.description } });
      for (const [index, item] of data.attributes.entries()) {
        const attribute = await tx.attributeDefinition.upsert({
          where: { key: item.key },
          create: { name: item.name, key: item.key, type: item.type, unit: item.unit, options: item.options, isFilterable: item.filterable, isVariantAxis: item.variantAxis },
          update: {},
        });
        await tx.productTypeAttribute.create({
          data: { productTypeId: created.id, attributeId: attribute.id, isRequired: item.required, isFilterable: item.filterable, sortOrder: index },
        });
      }
      return tx.productType.findUniqueOrThrow({ where: { id: created.id }, include: { attributes: { include: { attribute: true }, orderBy: { sortOrder: "asc" } } } });
    });
    return NextResponse.json({ productType }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Product type slug or attribute key already conflicts with the catalogue." }, { status: 409 });
  }
}
