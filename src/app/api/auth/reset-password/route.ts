import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const schema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/i),
  password: z.string().min(12).max(128),
});

function digest(token: string) {
  const secret = process.env.APP_SECRET;
  if (!secret || secret.length < 32) throw new Error("Password recovery is not configured.");
  return createHmac("sha256", secret).update(token).digest("hex");
}

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Use a valid reset link and a password of at least 12 characters." }, { status: 400 });

  try {
    const tokenHash = digest(parsed.data.token);
    const now = new Date();
    const token = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!token || token.usedAt || token.expiresAt <= now) {
      return NextResponse.json({ error: "This reset link is invalid or has expired. Request a new link." }, { status: 400 });
    }

    const passwordHash = await hashPassword(parsed.data.password);
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.passwordResetToken.updateMany({
        where: { id: token.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (claimed.count !== 1) throw new Error("RESET_TOKEN_ALREADY_USED");
      await tx.user.update({
        where: { id: token.userId },
        data: { passwordHash, sessionVersion: { increment: 1 } },
      });
      await tx.passwordResetToken.updateMany({
        where: { userId: token.userId, id: { not: token.id }, usedAt: null },
        data: { usedAt: now },
      });
    });
    return NextResponse.json({ message: "Password updated. Sign in with your new password." });
  } catch (error) {
    if (error instanceof Error && error.message === "RESET_TOKEN_ALREADY_USED") {
      return NextResponse.json({ error: "This reset link is invalid or has expired. Request a new link." }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to update your password right now. Please request a new reset link." }, { status: 503 });
  }
}
