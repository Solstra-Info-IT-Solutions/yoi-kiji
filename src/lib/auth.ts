import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const scrypt = promisify(scryptCallback);
const COOKIE_NAME = "yoikiji_session";
const SESSION_SECONDS = 60 * 60 * 24 * 14;

function secret() {
  const value = process.env.APP_SECRET;
  if (!value || value.length < 32) throw new Error("APP_SECRET must be configured with at least 32 characters.");
  return value;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [algorithm, salt, hash] = stored.split(":");
  if (algorithm !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export async function createSession(userId: string) {
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp: Math.floor(Date.now()/1000) + SESSION_SECONDS })).toString("base64url");
  const jar = await cookies();
  jar.set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub: string; exp: number };
    if (!data.sub || data.exp < Math.floor(Date.now()/1000)) return null;
    return await prisma.user.findUnique({ where: { id: data.sub }, select: { id: true, email: true, name: true, role: true } });
  } catch {
    return null;
  }
}
