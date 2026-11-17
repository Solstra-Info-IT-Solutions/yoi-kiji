import { createHmac, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const schema = z.object({ email: z.string().trim().email().max(254).transform(value => value.toLowerCase()) });
const GENERIC_RESPONSE = { message: "If an account exists for that email, password reset instructions will be sent shortly." };

function digest(value: string) {
  const secret = process.env.APP_SECRET;
  if (!secret || secret.length < 32) throw new Error("Password recovery is not configured.");
  return createHmac("sha256", secret).update(value).digest("hex");
}

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  try {
    const emailHash = digest(parsed.data.email);
    const forwarded = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const ipHash = digest(forwarded);
    const since = new Date(Date.now() - 60 * 60 * 1000);
    await prisma.passwordResetRequestLog.create({ data: { emailHash, ipHash } });

    const [ipRequests, emailRequests] = await Promise.all([
      prisma.passwordResetRequestLog.count({ where: { ipHash, createdAt: { gte: since } } }),
      prisma.passwordResetRequestLog.count({ where: { emailHash, createdAt: { gte: since } } }),
    ]);
    if (ipRequests > 5 || emailRequests > 3) return NextResponse.json(GENERIC_RESPONSE, { status: 202 });

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true, name: true, email: true } });
    if (!user) return NextResponse.json(GENERIC_RESPONSE, { status: 202 });

    const apiKey = process.env.EMAIL_API_KEY;
    const from = process.env.EMAIL_FROM;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!apiKey || !from || !siteUrl) return NextResponse.json(GENERIC_RESPONSE, { status: 202 });

    const token = randomBytes(32).toString("hex");
    const tokenHash = digest(token);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    const reset = await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    try {
      const resetUrl = new URL("/reset-password", siteUrl);
      resetUrl.searchParams.set("token", token);
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [user.email],
          subject: "Reset your YOI KIJI password",
          text: "We received a request to reset your YOI KIJI password. This link expires in 30 minutes: " + resetUrl.toString() + "\n\nIf you did not request this, you can ignore this email.",
          html: "<div style='font-family:Arial,sans-serif;color:#102f20;max-width:560px;margin:auto'><h1 style='letter-spacing:.18em'>YOI KIJI</h1><h2>Reset your password</h2><p>This secure link expires in 30 minutes.</p><p><a href='" + resetUrl.toString() + "' style='display:inline-block;padding:14px 22px;background:#102f20;color:#f2f0e9;text-decoration:none'>Choose a new password</a></p><p>If you did not request this, you can safely ignore this email.</p></div>",
        }),
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Email provider rejected password recovery.");
    } catch {
      await prisma.passwordResetToken.delete({ where: { id: reset.id } });
    }
    return NextResponse.json(GENERIC_RESPONSE, { status: 202 });
  } catch {
    return NextResponse.json({ error: "Password recovery is temporarily unavailable." }, { status: 503 });
  }
}
