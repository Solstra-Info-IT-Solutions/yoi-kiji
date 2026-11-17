import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  prisma: {
    passwordResetRequestLog: { create: vi.fn(), count: vi.fn() },
    passwordResetToken: { updateMany: vi.fn(), create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
  hashPassword: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/auth", () => ({ hashPassword: mocks.hashPassword }));

import { POST as requestReset } from "@/app/api/auth/forgot-password/route";
import { POST as completeReset } from "@/app/api/auth/reset-password/route";

function request(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": "203.0.113.10" },
    body: JSON.stringify(body),
  });
}

describe("password recovery request", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.APP_SECRET = "test-secret-with-at-least-32-characters";
    process.env.EMAIL_API_KEY = "test-resend-key";
    process.env.EMAIL_FROM = "YOI KIJI <security@example.com>";
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com";
    mocks.prisma.passwordResetRequestLog.count.mockResolvedValue(1);
    mocks.prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
    mocks.prisma.passwordResetToken.create.mockResolvedValue({ id: "reset-1" });
    mocks.prisma.user.findUnique.mockResolvedValue(null);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });

  it("does not disclose whether an email address has an account", async () => {
    const response = await requestReset(request("http://localhost/api/auth/forgot-password", { email: "unknown@example.com" }));
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ message: expect.any(String) });
    expect(mocks.prisma.passwordResetToken.create).not.toHaveBeenCalled();
  });

  it("returns a generic response when request rate limits are exceeded", async () => {
    mocks.prisma.passwordResetRequestLog.count.mockResolvedValueOnce(6).mockResolvedValueOnce(1);
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "u1", email: "buyer@example.com", name: "Buyer" });
    const response = await requestReset(request("http://localhost/api/auth/forgot-password", { email: "buyer@example.com" }));
    expect(response.status).toBe(202);
    expect(mocks.prisma.passwordResetToken.create).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("creates a hashed, expiring token and sends the reset link", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "u1", email: "buyer@example.com", name: "Buyer" });
    const response = await requestReset(request("http://localhost/api/auth/forgot-password", { email: "buyer@example.com" }));
    expect(response.status).toBe(202);
    expect(mocks.prisma.passwordResetToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: "u1", tokenHash: expect.any(String), expiresAt: expect.any(Date) }),
    });
    expect(fetch).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({ method: "POST" }));
  });
});

describe("password reset completion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.APP_SECRET = "test-secret-with-at-least-32-characters";
    mocks.hashPassword.mockResolvedValue("scrypt:hashed-password");
    mocks.prisma.passwordResetToken.findUnique.mockResolvedValue({
      id: "reset-1", userId: "u1", usedAt: null, expiresAt: new Date(Date.now() + 60_000),
    });
    mocks.prisma.$transaction.mockImplementation(async (callback: (tx: typeof mocks.prisma) => Promise<void>) => callback(mocks.prisma));
    mocks.prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
    mocks.prisma.user.update.mockResolvedValue({ id: "u1" });
  });

  it("rejects malformed or short passwords", async () => {
    const response = await completeReset(request("http://localhost/api/auth/reset-password", { token: "bad", password: "short" }));
    expect(response.status).toBe(400);
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects expired or previously used reset tokens", async () => {
    mocks.prisma.passwordResetToken.findUnique.mockResolvedValue({
      id: "reset-1", userId: "u1", usedAt: new Date(), expiresAt: new Date(Date.now() + 60_000),
    });
    const response = await completeReset(request("http://localhost/api/auth/reset-password", { token: "a".repeat(64), password: "a-strong-password-123" }));
    expect(response.status).toBe(400);
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("updates the password, consumes the token and revokes existing sessions", async () => {
    const response = await completeReset(request("http://localhost/api/auth/reset-password", { token: "a".repeat(64), password: "a-strong-password-123" }));
    expect(response.status).toBe(200);
    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { passwordHash: "scrypt:hashed-password", sessionVersion: { increment: 1 } },
    });
    expect(mocks.prisma.passwordResetToken.updateMany).toHaveBeenCalledTimes(2);
  });
});
