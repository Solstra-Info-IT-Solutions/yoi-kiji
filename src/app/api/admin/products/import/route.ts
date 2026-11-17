import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { parseCsv } from "@/lib/product-csv";

export const runtime = "nodejs";
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_ROWS = 500;
const headers = ["name","slug","description","sku","categorySlug","hsnCode","material","color","careInstructions","weightGrams","lengthMm","widthMm","heightMm","pricePaise","compareAtPaise","gstRateBps","inventoryQty","isActive","imageUrl","imageAlt"] as const;
const optionalText = (value: string) => value.trim() || undefined;
const numberField = (value: string, label: string, row: number, required = false) => {
  if (!value.trim()) {
    if (required) throw new Error(`Row ${row}: ${label} is required.`);
    return undefined;
  }
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw new Error(`Row ${row}: ${label} must be a whole number.`);
  return number;
};
const productSchema = z.object({
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
  gstRateBps: z.number().int().min(0).max(10000),
  inventoryQty: z.number().int().min(0),
  isActive: z.boolean(),
  imageUrl: z.string().url().optional(),
  imageAlt: z.string().max(200).optional(),
});
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".csv")) {
    return NextResponse.json({ error: "Choose a CSV file." }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_BYTES) return NextResponse.json({ error: "CSV must be between 1 byte and 2 MB." }, { status: 400 });
  let rows: string[][];
  try { rows = parseCsv((await file.text()).replace(/^\uFEFF/, "")); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid CSV." }, { status: 400 }); }
  if (rows.length < 2) return NextResponse.json({ error: "CSV must include a header and at least one product row." }, { status: 400 });
  if (rows.length - 1 > MAX_ROWS) return NextResponse.json({ error: `Import is limited to ${MAX_ROWS} products per file.` }, { status: 400 });
  const suppliedHeaders = rows[0].map(value => value.trim());
  if (suppliedHeaders.length !== headers.length || headers.some((header, index) => suppliedHeaders[index] !== header)) {
    return NextResponse.json({ error: "CSV headers do not match the exported YOI KIJI product template. Download a fresh template and keep its columns in the same order." }, { status: 400 });
  }
  const errors: string[] = [];
  let imported = 0;
  const seenSkus = new Set<string>();
  const seenSlugs = new Set<string>();
  for (let index = 1; index < rows.length; index++) {
    const rowNumber = index + 1;
    const cells = rows[index];
    if (cells.length !== headers.length) { errors.push(`Row ${rowNumber}: expected ${headers.length} columns, received ${cells.length}.`); continue; }
    try {
      const values = Object.fromEntries(headers.map((header, column) => [header, cells[column].trim()]));
      const sku = String(values.sku);
      const slug = String(values.slug);
      if (seenSkus.has(sku) || seenSlugs.has(slug)) throw new Error("Duplicate SKU or slug within this file.");
      seenSkus.add(sku); seenSlugs.add(slug);
      const category = await prisma.category.findUnique({ where: { slug: String(values.categorySlug) }, select: { id: true, isActive: true } });
      if (!category?.isActive) throw new Error("Category slug does not match an active category.");
      const activeText = String(values.isActive).toLowerCase();
      if (!["true", "false", "1", "0", "yes", "no"].includes(activeText)) throw new Error("isActive must be true, false, 1, 0, yes or no.");
      const parsed = productSchema.safeParse({
        name: values.name, slug, description: values.description, sku,
        hsnCode: optionalText(values.hsnCode), material: optionalText(values.material), color: optionalText(values.color),
        careInstructions: optionalText(values.careInstructions),
        weightGrams: numberField(values.weightGrams, "weightGrams", rowNumber),
        lengthMm: numberField(values.lengthMm, "lengthMm", rowNumber),
        widthMm: numberField(values.widthMm, "widthMm", rowNumber),
        heightMm: numberField(values.heightMm, "heightMm", rowNumber),
        pricePaise: numberField(values.pricePaise, "pricePaise", rowNumber, true),
        compareAtPaise: numberField(values.compareAtPaise, "compareAtPaise", rowNumber),
        gstRateBps: numberField(values.gstRateBps, "gstRateBps", rowNumber) ?? 0,
        inventoryQty: numberField(values.inventoryQty, "inventoryQty", rowNumber, true),
        isActive: ["true","1","yes"].includes(activeText),
        imageUrl: optionalText(values.imageUrl), imageAlt: optionalText(values.imageAlt),
      });
      if (!parsed.success) throw new Error(parsed.error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).join("; "));
      const { imageUrl, imageAlt, ...productData } = parsed.data;
      await prisma.$transaction(async tx => {
        const created = await tx.product.create({
          data: {
            ...productData, categoryId: category.id,
            categoryLinks: { create: { categoryId: category.id, isPrimary: true } },
            images: imageUrl ? { create: { url: imageUrl, alt: imageAlt ?? productData.name } } : undefined,
          },
        });
        if (created.inventoryQty > 0) await tx.inventoryMovement.create({
          data: { productId: created.id, quantityDelta: created.inventoryQty, reason: "PRODUCT_INITIAL_STOCK", createdBy: admin.id },
        });
      });
      imported++;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to import this product.";
      if (message.includes("Unique constraint")) errors.push(`Row ${rowNumber}: SKU or slug already exists.`);
      else errors.push(`Row ${rowNumber}: ${message}`);
    }
  }
  return NextResponse.json({ imported, failed: errors.length, errors });
}
