import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  order: {
    updateMany: vi.fn(),
    findUnique: vi.fn(),
  },
}));

vi.mock("@/lib/admin", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/prisma", () => ({ prisma: { order: mocks.order } }));

import { PATCH } from "./route";

function request(body: unknown) {
  return new Request("http://localhost/api/admin/orders/order-1/fulfillment", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as never;
}

const valid = {
  provider: "DELHIVERY",
  trackingNumber: "AWB-12345",
  trackingUrl: "https://www.delhivery.com/track/package/AWB-12345",
};

describe("admin fulfillment details", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({ id: "admin-1" });
    mocks.order.updateMany.mockResolvedValue({ count: 1 });
    mocks.order.findUnique.mockResolvedValue({ id: "order-1", ...valid });
  });

  it("saves HTTPS tracking details with a conditional non-terminal order update", async () => {
    const response = await PATCH(request(valid), { params: Promise.resolve({ id: "order-1" }) });
    expect(response.status).toBe(200);
    expect(mocks.order.updateMany).toHaveBeenCalledWith({
      where: { id: "order-1", status: { notIn: ["CANCELLED", "REFUNDED"] } },
      data: {
        fulfillmentProvider: "DELHIVERY",
        trackingNumber: "AWB-12345",
        trackingUrl: "https://www.delhivery.com/track/package/AWB-12345",
        fulfillmentOrderId: null,
      },
    });
  });

  it.each([
    "http://www.delhivery.com/track/AWB-12345",
    "javascript:alert(1)",
    "https://user:password@carrier.example/track/AWB-12345",
  ])("rejects unsafe tracking URL %s", async (trackingUrl) => {
    const response = await PATCH(request({ ...valid, trackingUrl }), { params: Promise.resolve({ id: "order-1" }) });
    expect(response.status).toBe(400);
    expect(mocks.order.updateMany).not.toHaveBeenCalled();
  });

  it("requires a tracking number whenever a tracking URL is provided", async () => {
    const response = await PATCH(request({ provider: "DELHIVERY", trackingUrl: valid.trackingUrl }), { params: Promise.resolve({ id: "order-1" }) });
    expect(response.status).toBe(400);
    expect(mocks.order.updateMany).not.toHaveBeenCalled();
  });

  it("does not attach tracking to cancelled or refunded orders", async () => {
    mocks.order.updateMany.mockResolvedValue({ count: 0 });
    mocks.order.findUnique.mockResolvedValue({ id: "order-1" });
    const response = await PATCH(request(valid), { params: Promise.resolve({ id: "order-1" }) });
    expect(response.status).toBe(409);
  });

  it("returns conflict when the carrier shipment reference is already assigned", async () => {
    mocks.order.updateMany.mockRejectedValue({ code: "P2002" });
    const response = await PATCH(request({ ...valid, fulfillmentOrderId: "SHIP-1" }), { params: Promise.resolve({ id: "order-1" }) });
    expect(response.status).toBe(409);
  });

  it("requires an administrator", async () => {
    mocks.requireAdmin.mockResolvedValue(null);
    const response = await PATCH(request(valid), { params: Promise.resolve({ id: "order-1" }) });
    expect(response.status).toBe(403);
    expect(mocks.order.updateMany).not.toHaveBeenCalled();
  });
});
