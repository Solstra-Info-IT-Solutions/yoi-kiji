import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { csvCell } from "@/lib/product-csv";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
  const products = await prisma.product.findMany({
    include: { category: { select: { slug: true } }, images: { where: { isPrimary: true }, take: 1 }, variants: true },
    orderBy: { sku: "asc" },
    take: 5000,
  });
  const headers = ["name","slug","description","sku","categorySlug","hsnCode","material","color","careInstructions","weightGrams","lengthMm","widthMm","heightMm","pricePaise","compareAtPaise","gstRateBps","inventoryQty","isActive","imageUrl","imageAlt"];
  const rows = products.map(product => [
    product.name, product.slug, product.description, product.sku, product.category?.slug ?? "",
    product.hsnCode, product.material, product.color, product.careInstructions,
    product.weightGrams, product.lengthMm, product.widthMm, product.heightMm,
    product.pricePaise, product.compareAtPaise, product.gstRateBps, product.inventoryQty,
    product.isActive, product.images[0]?.url ?? "", product.images[0]?.alt ?? "",
  ]);
  const content = [headers, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n");
  return new NextResponse("\uFEFF" + content, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="yoi-kiji-products.csv"',
      "Cache-Control": "no-store",
    },
  });
}
