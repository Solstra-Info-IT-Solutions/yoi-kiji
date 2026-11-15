import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const schema = z.object({ productId: z.string().min(1) });

function signUpload(params: Record<string, string>, secret: string) {
  const canonical = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join("&");
  return createHash("sha1").update(canonical + secret).digest("hex");
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "A valid product ID is required." }, { status: 400 });

  const product = await prisma.product.findUnique({ where: { id: parsed.data.productId }, select: { id: true } });
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: "Product image storage is not configured. Set the Cloudinary server credentials." }, { status: 503 });
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const folder = `yoi-kiji/products/${product.id}`;
  const publicId = randomUUID();
  const params = {
    allowed_formats: "jpg,png,webp,avif",
    folder,
    overwrite: "false",
    public_id: publicId,
    timestamp,
  };
  return NextResponse.json({
    cloudName,
    apiKey,
    timestamp,
    folder,
    publicId,
    allowedFormats: params.allowed_formats,
    signature: signUpload(params, apiSecret),
  });
}
