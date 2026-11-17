import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const secureTrackingUrl = z.string().url().refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}, "Tracking links must use HTTPS and cannot contain embedded credentials.");

const schema = z.object({
  provider: z.enum(["DELHIVERY", "ATS", "MANUAL"]),
  trackingNumber: z.string().trim().min(1).max(120).optional(),
  trackingUrl: secureTrackingUrl.optional(),
  fulfillmentOrderId: z.string().trim().min(1).max(120).optional(),
}).refine((value) => !value.trackingUrl || Boolean(value.trackingNumber), {
  message: "A tracking number is required when a tracking URL is supplied.",
  path: ["trackingNumber"],
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid fulfillment details." }, { status: 400 });
  }

  try {
    // Conditional update prevents fulfillment details being attached to an order
    // that was cancelled/refunded while the admin form was open.
    const result = await prisma.order.updateMany({
      where: { id, status: { notIn: ["CANCELLED", "REFUNDED"] } },
      data: {
        fulfillmentProvider: parsed.data.provider,
        trackingNumber: parsed.data.trackingNumber ?? null,
        trackingUrl: parsed.data.trackingUrl ?? null,
        fulfillmentOrderId: parsed.data.fulfillmentOrderId ?? null,
      },
    });

    if (result.count !== 1) {
      const exists = await prisma.order.findUnique({ where: { id }, select: { id: true } });
      return NextResponse.json(
        { error: exists ? "Fulfillment cannot be changed for a cancelled or refunded order." : "Order not found." },
        { status: exists ? 409 : 404 },
      );
    }

    const order = await prisma.order.findUnique({ where: { id } });
    return NextResponse.json({ order });
  } catch (error) {
    if ((error as { code?: string })?.code === "P2002") {
      return NextResponse.json({ error: "This carrier shipment reference is already assigned to another order." }, { status: 409 });
    }
    throw error;
  }
}
