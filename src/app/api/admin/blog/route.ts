import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const slugSchema = z.string().trim().min(2).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const schema = z.object({
  title: z.string().trim().min(3).max(180),
  slug: slugSchema,
  excerpt: z.string().max(500).optional().nullable(),
  contentMarkdown: z.string().trim().min(1).max(100000),
  coverImageUrl: z.union([z.string().url(), z.literal("")]).optional().nullable(),
  coverImageAlt: z.string().max(200).optional().nullable(),
  seoTitle: z.string().max(160).optional().nullable(),
  seoDescription: z.string().max(320).optional().nullable(),
  canonicalUrl: z.union([z.string().url(), z.literal("")]).optional().nullable(),
  noIndex: z.boolean().default(false),
  status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  scheduledAt: z.string().datetime().optional().nullable(),
  categoryIds: z.array(z.string().min(1)).max(30).default([]),
  tagIds: z.array(z.string().min(1)).max(50).default([]),
  relatedProductIds: z.array(z.string().min(1)).max(50).default([]),
}).superRefine((value, ctx) => {
  if (value.status === "SCHEDULED" && !value.scheduledAt) ctx.addIssue({ code: "custom", path: ["scheduledAt"], message: "A scheduled publication date is required." });
  if (value.status === "SCHEDULED" && value.scheduledAt && new Date(value.scheduledAt) <= new Date()) ctx.addIssue({ code: "custom", path: ["scheduledAt"], message: "Scheduled publication must be in the future." });
});

const include = {
  author: { select: { id: true, name: true, email: true } },
  categories: { include: { category: true } },
  tags: { include: { tag: true } },
  relatedProducts: { include: { product: { select: { id: true, name: true, slug: true, sku: true } } }, orderBy: { sortOrder: "asc" as const } },
};

async function authorised() {
  const user = await requireAdmin();
  return user?.role === "ADMIN" ? user : null;
}

async function validateRelations(data: z.infer<typeof schema>) {
  const [categories, tags, products] = await Promise.all([
    prisma.blogCategory.findMany({ where: { id: { in: data.categoryIds } }, select: { id: true } }),
    prisma.blogTag.findMany({ where: { id: { in: data.tagIds } }, select: { id: true } }),
    prisma.product.findMany({ where: { id: { in: data.relatedProductIds }, isActive: true }, select: { id: true } }),
  ]);
  return categories.length === new Set(data.categoryIds).size &&
    tags.length === new Set(data.tagIds).size &&
    products.length === new Set(data.relatedProductIds).size;
}

function relations(data: z.infer<typeof schema>) {
  return {
    categories: { create: data.categoryIds.map(categoryId => ({ category: { connect: { id: categoryId } } })) },
    tags: { create: data.tagIds.map(tagId => ({ tag: { connect: { id: tagId } } })) },
    relatedProducts: { create: data.relatedProductIds.map((productId, sortOrder) => ({ product: { connect: { id: productId } }, sortOrder })) },
  };
}

export async function GET(request: NextRequest) {
  const admin = await authorised();
  if (!admin) return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
  const query = request.nextUrl.searchParams.get("q")?.trim();
  const status = request.nextUrl.searchParams.get("status");
  const posts = await prisma.blogPost.findMany({
    where: {
      ...(query ? { OR: [{ title: { contains: query, mode: "insensitive" as const } }, { slug: { contains: query, mode: "insensitive" as const } }] } : {}),
      ...(status && ["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"].includes(status) ? { status: status as "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED" } : {}),
    },
    include, orderBy: [{ updatedAt: "desc" }], take: 100,
  });
  const [categories, tags, products] = await Promise.all([
    prisma.blogCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.blogTag.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { isActive: true }, select: { id: true, name: true, sku: true }, orderBy: { name: "asc" }, take: 300 }),
  ]);
  return NextResponse.json({ posts, categories, tags, products });
}

export async function POST(request: NextRequest) {
  const admin = await authorised();
  if (!admin) return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid blog post.", details: parsed.error.flatten() }, { status: 400 });
  if (!await validateRelations(parsed.data)) return NextResponse.json({ error: "One or more selected categories, tags or active products do not exist." }, { status: 400 });
  const { categoryIds, tagIds, relatedProductIds, scheduledAt, ...fields } = parsed.data;
  try {
    const post = await prisma.blogPost.create({
      data: {
        ...fields,
        coverImageUrl: fields.coverImageUrl || null,
        canonicalUrl: fields.canonicalUrl || null,
        authorId: admin.id,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        publishedAt: fields.status === "PUBLISHED" ? new Date() : null,
        ...relations({ ...parsed.data, categoryIds, tagIds, relatedProductIds }),
      },
      include,
    });
    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string })?.code === "P2002") return NextResponse.json({ error: "A blog post with this slug already exists." }, { status: 409 });
    throw error;
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await authorised();
  if (!admin) return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "Post id is required." }, { status: 400 });
  const parsed = schema.partial().safeParse(body.data);
  if (!parsed.success) return NextResponse.json({ error: "Invalid blog post update.", details: parsed.error.flatten() }, { status: 400 });
  const current = await prisma.blogPost.findUnique({ where: { id: body.id }, select: { id: true, publishedAt: true } });
  if (!current) return NextResponse.json({ error: "Blog post not found." }, { status: 404 });
  const merged = { ...parsed.data };
  if (parsed.data.status === "SCHEDULED" && (!parsed.data.scheduledAt || new Date(parsed.data.scheduledAt) <= new Date())) {
    return NextResponse.json({ error: "Scheduled posts require a future publication date." }, { status: 400 });
  }
  const relationIdsProvided = ["categoryIds", "tagIds", "relatedProductIds"].some(key => Object.prototype.hasOwnProperty.call(parsed.data, key));
  const relationData = {
    categoryIds: parsed.data.categoryIds ?? [],
    tagIds: parsed.data.tagIds ?? [],
    relatedProductIds: parsed.data.relatedProductIds ?? [],
  };
  if (relationIdsProvided && !await validateRelations(relationData as z.infer<typeof schema>)) return NextResponse.json({ error: "One or more selected categories, tags or active products do not exist." }, { status: 400 });
  const { categoryIds, tagIds, relatedProductIds, scheduledAt, ...fields } = merged;
  const data = {
    ...fields,
    ...(fields.coverImageUrl !== undefined ? { coverImageUrl: fields.coverImageUrl || null } : {}),
    ...(fields.canonicalUrl !== undefined ? { canonicalUrl: fields.canonicalUrl || null } : {}),
    ...(scheduledAt !== undefined ? { scheduledAt: scheduledAt ? new Date(scheduledAt) : null } : {}),
    ...(fields.status === "PUBLISHED" && !current.publishedAt ? { publishedAt: new Date() } : {}),
    ...(fields.status === "DRAFT" || fields.status === "ARCHIVED" ? { scheduledAt: null } : {}),
    ...(relationIdsProvided ? {
      categories: { deleteMany: {}, create: (categoryIds ?? []).map(id => ({ category: { connect: { id } } })) },
      tags: { deleteMany: {}, create: (tagIds ?? []).map(id => ({ tag: { connect: { id } } })) },
      relatedProducts: { deleteMany: {}, create: (relatedProductIds ?? []).map((id, sortOrder) => ({ product: { connect: { id } }, sortOrder })) },
    } : {}),
  };
  try {
    const post = await prisma.blogPost.update({ where: { id: body.id }, data, include });
    return NextResponse.json({ post });
  } catch (error) {
    if ((error as { code?: string })?.code === "P2002") return NextResponse.json({ error: "A blog post with this slug already exists." }, { status: 409 });
    throw error;
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await authorised();
  if (!admin) return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Post id is required." }, { status: 400 });
  const result = await prisma.blogPost.updateMany({ where: { id }, data: { status: "ARCHIVED", scheduledAt: null, noIndex: true } });
  if (!result.count) return NextResponse.json({ error: "Blog post not found." }, { status: 404 });
  return NextResponse.json({ archived: true });
}
