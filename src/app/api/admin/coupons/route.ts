import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

async function authorised() {
  const admin = await requireAdmin();
  return admin?.role === "ADMIN" ? admin : null;
}
const schema = z.object({
  code: z.string().trim().min(3).max(32).regex(/^[A-Za-z0-9_-]+$/).transform(value => value.toUpperCase()),
  description: z.string().max(240).optional().nullable(),
  discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
  discountValue: z.number().int().positive(),
  minimumSubtotalPaise: z.number().int().min(0).default(0),
  maximumDiscountPaise: z.number().int().positive().optional().nullable(),
  usageLimit: z.number().int().positive().optional().nullable(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().default(true),
}).superRefine((value, ctx) => {
  if (value.discountType === "PERCENTAGE" && value.discountValue > 10000) ctx.addIssue({ code: "custom", path: ["discountValue"], message: "Percentage must be between 1 and 10000 basis points." });
  if (value.endsAt && value.startsAt && new Date(value.endsAt) <= new Date(value.startsAt)) ctx.addIssue({ code: "custom", path: ["endsAt"], message: "End date must be after start date." });
});

export async function GET() {
  const admin = await authorised();
  if (!admin) return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
  const coupons = await prisma.coupon.findMany({ include: { _count: { select: { redemptions: true } } }, orderBy: { createdAt: "desc" }, take: 200 });
  return NextResponse.json({ coupons });
}
export async function POST(request: NextRequest) {
  const admin = await authorised();
  if (!admin) return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid promotion details.", details: parsed.error.flatten() }, { status: 400 });
  try {
    const coupon = await prisma.coupon.create({ data: { ...parsed.data, startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null, endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null } });
    return NextResponse.json({ coupon }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "A promotion with this code already exists." }, { status: 409 });
  }
}
export async function PATCH(request: NextRequest) {
  const admin = await authorised();
  if (!admin) return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "Promotion id is required." }, { status: 400 });
  const parsed = schema.partial().safeParse(body.data);
  if (!parsed.success) return NextResponse.json({ error: "Invalid promotion update.", details: parsed.error.flatten() }, { status: 400 });
  try {
    const data = { ...parsed.data, ...(parsed.data.startsAt !== undefined ? { startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null } : {}), ...(parsed.data.endsAt !== undefined ? { endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null } : {}) };
    const coupon = await prisma.coupon.update({ where: { id: body.id }, data });
    return NextResponse.json({ coupon });
  } catch {
    return NextResponse.json({ error: "Promotion not found or code is already in use." }, { status: 404 });
  }
}
export async function DELETE(request: NextRequest) {
  const admin = await authorised();
  if (!admin) return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Promotion id is required." }, { status: 400 });
  try {
    const coupon = await prisma.coupon.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ coupon });
  } catch {
    return NextResponse.json({ error: "Promotion not found." }, { status: 404 });
  }
}
