import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  blogPost: { findMany: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  blogCategory: { findMany: vi.fn(), create: vi.fn() },
  blogTag: { findMany: vi.fn(), create: vi.fn() },
  product: { findMany: vi.fn() },
}));
vi.mock("@/lib/admin", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks }));

import { GET, POST, PATCH, DELETE } from "./route";

function request(method: string, body?: unknown, url = "http://localhost/api/admin/blog") {
  return new Request(url, { method, headers: { "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }) as never;
}
const valid = {
  title: "A considered home",
  slug: "a-considered-home",
  contentMarkdown: "A thoughtful story about textiles.",
  status: "DRAFT",
  categoryIds: [],
  tagIds: [],
  relatedProductIds: [],
};

describe("admin blog content API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    mocks.blogCategory.findMany.mockResolvedValue([]);
    mocks.blogTag.findMany.mockResolvedValue([]);
    mocks.product.findMany.mockResolvedValue([]);
    mocks.blogPost.findMany.mockResolvedValue([]);
    mocks.blogPost.create.mockResolvedValue({ id: "post-1", ...valid });
    mocks.blogPost.findUnique.mockResolvedValue({ id: "post-1", publishedAt: null });
    mocks.blogPost.update.mockResolvedValue({ id: "post-1" });
    mocks.blogPost.updateMany.mockResolvedValue({ count: 1 });
  });

  it("requires administrator access", async () => {
    mocks.requireAdmin.mockResolvedValue({ id: "staff-1", role: "STAFF" });
    const response = await GET(request("GET"));
    expect(response.status).toBe(403);
  });

  it("creates a draft with validated content relations and author attribution", async () => {
    const response = await POST(request("POST", valid));
    expect(response.status).toBe(201);
    expect(mocks.blogPost.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ title: valid.title, authorId: "admin-1", status: "DRAFT" }),
    }));
  });

  it("rejects scheduled posts without a future publication date", async () => {
    const response = await POST(request("POST", { ...valid, status: "SCHEDULED" }));
    expect(response.status).toBe(400);
    expect(mocks.blogPost.create).not.toHaveBeenCalled();
  });

  it("rejects invalid slugs before database writes", async () => {
    const response = await POST(request("POST", { ...valid, slug: "../unsafe" }));
    expect(response.status).toBe(400);
    expect(mocks.blogPost.create).not.toHaveBeenCalled();
  });

  it("archives rather than hard-deletes a post", async () => {
    const response = await DELETE(request("DELETE", undefined, "http://localhost/api/admin/blog?id=post-1"));
    expect(response.status).toBe(200);
    expect(mocks.blogPost.updateMany).toHaveBeenCalledWith({
      where: { id: "post-1" }, data: { status: "ARCHIVED", scheduledAt: null, noIndex: true },
    });
  });

  it("rejects edits for a missing post", async () => {
    mocks.blogPost.findUnique.mockResolvedValue(null);
    const response = await PATCH(request("PATCH", { id: "missing", data: { title: "Changed title" } }));
    expect(response.status).toBe(404);
  });
});
