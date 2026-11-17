import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 300;

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const now = new Date();
  if (slug) {
    const post = await prisma.blogPost.findFirst({
      where: { slug, status: "PUBLISHED", publishedAt: { lte: now }, noIndex: false },
      select: {
        id: true, title: true, slug: true, excerpt: true, contentMarkdown: true,
        coverImageUrl: true, coverImageAlt: true, seoTitle: true, seoDescription: true,
        canonicalUrl: true, publishedAt: true, updatedAt: true,
        author: { select: { name: true } },
        categories: { include: { category: { select: { name: true, slug: true } } } },
        tags: { include: { tag: { select: { name: true, slug: true } } } },
        relatedProducts: { include: { product: { select: { name: true, slug: true, pricePaise: true, images: { where: { isPrimary: true }, take: 1, select: { url: true, alt: true } } } } }, orderBy: { sortOrder: "asc" } },
      },
    });
    if (!post) return NextResponse.json({ error: "Article not found." }, { status: 404 });
    return NextResponse.json({ post });
  }
  const cursor = request.nextUrl.searchParams.get("cursor");
  const posts = await prisma.blogPost.findMany({
    where: { status: "PUBLISHED", publishedAt: { lte: now }, noIndex: false },
    select: { id: true, title: true, slug: true, excerpt: true, coverImageUrl: true, coverImageAlt: true, publishedAt: true, author: { select: { name: true } }, categories: { include: { category: { select: { name: true, slug: true } } } } },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: 12,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });
  return NextResponse.json({ posts, nextCursor: posts.length === 12 ? posts[posts.length - 1].id : null });
}
