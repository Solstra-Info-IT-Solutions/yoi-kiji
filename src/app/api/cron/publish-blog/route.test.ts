import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  blogPost: { findMany: vi.fn(), updateMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: mocks }));

import { POST } from "./route";

function request(secret?: string) {
  return new Request("http://localhost/api/cron/publish-blog", {
    method: "POST",
    headers: secret ? { authorization: "Bearer " + secret } : {},
  }) as never;
}

describe("scheduled blog publisher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-cron-secret";
    mocks.blogPost.findMany.mockResolvedValue([]);
    mocks.blogPost.updateMany.mockResolvedValue({ count: 1 });
  });

  it("rejects requests without the cron secret", async () => {
    const response = await POST(request("wrong-secret"));
    expect(response.status).toBe(401);
    expect(mocks.blogPost.findMany).not.toHaveBeenCalled();
  });

  it("returns a configuration error when the cron secret is missing", async () => {
    delete process.env.CRON_SECRET;
    const response = await POST(request());
    expect(response.status).toBe(503);
  });

  it("publishes only due scheduled posts and preserves their scheduled publication time", async () => {
    const scheduledAt = new Date(Date.now() - 60_000);
    mocks.blogPost.findMany.mockResolvedValue([{ id: "post-1", scheduledAt }]);
    const response = await POST(request("test-cron-secret"));
    expect(response.status).toBe(200);
    expect(mocks.blogPost.updateMany).toHaveBeenCalledWith({
      where: { id: "post-1", status: "SCHEDULED", AND: [{ scheduledAt }, { scheduledAt: { lte: expect.any(Date) } }] },
      data: { status: "PUBLISHED", publishedAt: scheduledAt },
    });
    expect(await response.json()).toEqual({ published: 1, checked: 1 });
  });

  it("does not count posts another worker has already published", async () => {
    mocks.blogPost.findMany.mockResolvedValue([{ id: "post-1", scheduledAt: new Date(Date.now() - 1000) }]);
    mocks.blogPost.updateMany.mockResolvedValue({ count: 0 });
    const response = await POST(request("test-cron-secret"));
    expect(await response.json()).toEqual({ published: 0, checked: 1 });
  });
});
