import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSession, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254).transform(v=>v.toLowerCase()),
  password: z.string().min(12).max(128),
});
export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(()=>null));
  if (!parsed.success) return NextResponse.json({ error: "Please provide a valid name, email and a password of at least 12 characters." }, { status: 400 });
  try {
    const passwordHash = await hashPassword(parsed.data.password);
    const user = await prisma.user.create({ data: { name: parsed.data.name, email: parsed.data.email, passwordHash }, select: { id: true, name: true, email: true } });
    await createSession(user.id);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    return NextResponse.json({ error: "Registration is temporarily unavailable." }, { status: 503 });
  }
}
