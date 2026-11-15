import { prisma } from "@/lib/prisma";

export const storefrontCategories = [
  { name: "Bedsheets", slug: "bedsheets", description: "Thoughtful layers for a more restful everyday.", sizes: ["Single", "Double", "King", "Fitted"] },
  { name: "Curtains", slug: "curtains", description: "A considered way to soften light and frame a room." },
  { name: "Upholstery", slug: "upholstery", description: "Tactile textiles for the spaces you make your own." },
  { name: "Bath Linen", slug: "bath-linen", description: "Everyday rituals, wrapped in comfort." },
  { name: "Kitchen Linen", slug: "kitchen-linen", description: "Useful details for the heart of the home." },
] as const;

export async function getActiveProducts(categorySlug?: string) {
  try {
    return await prisma.product.findMany({
      where: {
        isActive: true,
        ...(categorySlug ? { category: { slug: categorySlug } } : {}),
      },
      include: {
        images: { orderBy: { position: "asc" }, take: 1 },
        category: true,
        variants: { where: { isActive: true }, orderBy: { label: "asc" } },
      },
      orderBy: [{ createdAt: "desc" }],
    });
  } catch {
    // A missing database should not crash the public editorial shell.
    return [];
  }
}

export async function getActiveProductBySlug(slug: string) {
  try {
    return await prisma.product.findFirst({
      where: { slug, isActive: true },
      include: {
        images: { orderBy: { position: "asc" } },
        category: true,
        variants: { where: { isActive: true }, orderBy: { label: "asc" } },
      },
    });
  } catch {
    return null;
  }
}
