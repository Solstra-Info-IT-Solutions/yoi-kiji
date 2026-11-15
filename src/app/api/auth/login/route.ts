import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSession, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ email: z.string().trim().email().transform(v=>v.toLowerCase()), password: z.string().min(1).max(128) });
export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(()=>null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user?.passwordHash || !(await verifyPassword(parsed.data.password, user.passwordHash))) return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  await createSession(user.id);
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}
