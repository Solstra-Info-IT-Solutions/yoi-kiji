import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => {
 const tx = {
  order: { findUnique: vi.fn(), updateMany: vi.fn() },
  couponRedemption: { findFirst: vi.fn(), deleteMany: vi.fn() },
  coupon: { update: vi.fn() },
  product: { update: vi.fn() },
  productVariant: { update: vi.fn() },
  inventoryMovement: { create: vi.fn() },
 };
 return {
  tx,
  prisma: {
   order: { findMany: vi.fn() },
   $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
  },
 };
});

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));

import { POST } from "@/app/api/cron/expire-orders/route";

function request(authorization = "Bearer cron-test") {
 return new NextRequest("http://localhost/api/cron/expire-orders", {
  method: "POST",
  headers: { authorization },
 });
}

const expiredOrder = {
 id: "order-1",
 orderNumber: "YK-1001",
 status: "PENDING",
 reservationExpiresAt: new Date(Date.now() - 60_000),
 payment: { status: "CREATED" },
 items: [{ productId: "product-1", variantId: null, quantity: 2 }],
};

describe("expired order reservation recovery", () => {
 beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = "cron-test";
  mocks.prisma.order.findMany.mockResolvedValue([expiredOrder]);
  mocks.tx.order.findUnique.mockResolvedValue(expiredOrder);
  mocks.tx.order.updateMany.mockResolvedValue({ count: 1 });
  mocks.tx.couponRedemption.findFirst.mockResolvedValue({ couponId: "coupon-1" });
  mocks.tx.couponRedemption.deleteMany.mockResolvedValue({ count: 1 });
  mocks.tx.coupon.update.mockResolvedValue({});
  mocks.tx.product.update.mockResolvedValue({});
  mocks.tx.inventoryMovement.create.mockResolvedValue({});
 });

 it("releases coupon redemption and decrements usage exactly once", async () => {
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ expired: 1, checked: 1 });
  expect(mocks.tx.couponRedemption.deleteMany).toHaveBeenCalledWith({ where: { orderId: "order-1" } });
  expect(mocks.tx.coupon.update).toHaveBeenCalledWith({
   where: { id: "coupon-1" }, data: { usageCount: { decrement: 1 } },
  });
  expect(mocks.tx.product.update).toHaveBeenCalledTimes(1);
 });

 it("does not decrement usage when the order has no coupon redemption", async () => {
  mocks.tx.couponRedemption.findFirst.mockResolvedValue(null);
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(mocks.tx.couponRedemption.deleteMany).not.toHaveBeenCalled();
  expect(mocks.tx.coupon.update).not.toHaveBeenCalled();
 });

 it("does not release coupon or stock if another worker claimed expiry", async () => {
  mocks.tx.order.updateMany.mockResolvedValue({ count: 0 });
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ expired: 0, checked: 1 });
  expect(mocks.tx.couponRedemption.findFirst).not.toHaveBeenCalled();
  expect(mocks.tx.couponRedemption.deleteMany).not.toHaveBeenCalled();
  expect(mocks.tx.coupon.update).not.toHaveBeenCalled();
  expect(mocks.tx.product.update).not.toHaveBeenCalled();
  expect(mocks.tx.inventoryMovement.create).not.toHaveBeenCalled();
 });

 it("rejects invalid cron authorization", async () => {
  const response = await POST(request("Bearer wrong"));
  expect(response.status).toBe(401);
  expect(mocks.prisma.order.findMany).not.toHaveBeenCalled();
 });
});
