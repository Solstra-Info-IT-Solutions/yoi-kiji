import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  prisma: {
    product: { findFirst: vi.fn() },
    stockAlert: { upsert: vi.fn() },
    orderItem: { findFirst: vi.fn() },
    review: { upsert: vi.fn() },
  },
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));

import { POST as subscribeToStockAlert } from "@/app/api/stock-alerts/route";
import { POST as submitProductReview } from "@/app/api/products/[slug]/reviews/route";

function postRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("back-in-stock subscription API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects malformed email before querying the catalogue", async () => {
    const response = await subscribeToStockAlert(
      postRequest("http://localhost/api/stock-alerts", { productId: "p1", email: "not-an-email" }),
    );

    expect(response.status).toBe(400);
    expect(mocks.prisma.product.findFirst).not.toHaveBeenCalled();
    expect(mocks.prisma.stockAlert.upsert).not.toHaveBeenCalled();
  });

  it("rejects subscriptions while the product is available", async () => {
    mocks.prisma.product.findFirst.mockResolvedValue({
      id: "p1", hasVariants: false, inventoryQty: 4, variants: [],
    });

    const response = await subscribeToStockAlert(
      postRequest("http://localhost/api/stock-alerts", { productId: "p1", email: "buyer@example.com" }),
    );

    expect(response.status).toBe(409);
    expect(mocks.prisma.stockAlert.upsert).not.toHaveBeenCalled();
  });

  it("stores a normalized email for an unavailable product", async () => {
    mocks.prisma.product.findFirst.mockResolvedValue({
      id: "p1", hasVariants: true, inventoryQty: 0, variants: [{ inventoryQty: 0 }],
    });
    mocks.prisma.stockAlert.upsert.mockResolvedValue({ id: "alert-1" });

    const response = await subscribeToStockAlert(
      postRequest("http://localhost/api/stock-alerts", { productId: "p1", email: " BUYER@EXAMPLE.COM " }),
    );

    expect(response.status).toBe(201);
    expect(mocks.prisma.stockAlert.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { productId_email: { productId: "p1", email: "buyer@example.com" } },
      create: { productId: "p1", email: "buyer@example.com", status: "PENDING" },
    }));
  });
});

describe("verified product review API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.prisma.product.findFirst.mockResolvedValue({ id: "product-1" });
  });

  it("requires a signed-in customer", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await submitProductReview(
      postRequest("http://localhost/api/products/sample/reviews", {
        rating: 5, body: "A beautifully made product that feels lovely.",
      }),
      { params: Promise.resolve({ slug: "sample" }) },
    );

    expect(response.status).toBe(401);
    expect(mocks.prisma.review.upsert).not.toHaveBeenCalled();
  });

  it("rejects a review without a delivered and captured purchase", async () => {
    mocks.prisma.orderItem.findFirst.mockResolvedValue(null);

    const response = await submitProductReview(
      postRequest("http://localhost/api/products/sample/reviews", {
        rating: 5, body: "A beautifully made product that feels lovely.",
      }),
      { params: Promise.resolve({ slug: "sample" }) },
    );

    expect(response.status).toBe(403);
    expect(mocks.prisma.review.upsert).not.toHaveBeenCalled();
  });

  it("submits eligible reviews into moderation instead of publishing directly", async () => {
    mocks.prisma.orderItem.findFirst.mockResolvedValue({ id: "order-item-1" });
    mocks.prisma.review.upsert.mockResolvedValue({ id: "review-1", status: "PENDING" });

    const response = await submitProductReview(
      postRequest("http://localhost/api/products/sample/reviews", {
        rating: 5, title: "Lovely quality", body: "A beautifully made product that feels lovely.",
      }),
      { params: Promise.resolve({ slug: "sample" }) },
    );

    expect(response.status).toBe(201);
    expect(mocks.prisma.review.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        productId: "product-1", userId: "user-1", status: "PENDING", verifiedPurchase: true,
      }),
      update: expect.objectContaining({ status: "PENDING", verifiedPurchase: true }),
    }));
  });
});
