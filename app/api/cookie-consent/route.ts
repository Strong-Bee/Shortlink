import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { normalizeCategories, type CookieCategories } from "@/lib/cookie-consent.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "shortlink_consent";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 180;
const COOKIE_SECRET = process.env.COOKIE_CONSENT_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

type StoredConsent = {
  version: 1;
  updatedAt: string;
  categories: CookieCategories;
};

function sign(value: string): string {
  if (!COOKIE_SECRET) throw new Error("COOKIE_CONSENT_SECRET_MISSING");
  return createHmac("sha256", COOKIE_SECRET).update(value).digest("base64url");
}

function encodeConsent(consent: StoredConsent): string {
  const payload = Buffer.from(JSON.stringify(consent)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decodeConsent(value: string | undefined): StoredConsent | null {
  if (!value || !COOKIE_SECRET) return null;
  const separator = value.lastIndexOf(".");
  if (separator <= 0) return null;
  const payload = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as Partial<StoredConsent>;
    const categories = normalizeCategories(record.categories);
    if (record.version !== 1 || typeof record.updatedAt !== "string" || !categories) return null;
    if (!Number.isFinite(Date.parse(record.updatedAt))) return null;
    return { version: 1, updatedAt: record.updatedAt, categories };
  } catch {
    return null;
  }
}

function requestIsSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // Non-browser clients are still constrained by SameSite cookies.
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function missingSecretResponse() {
  return NextResponse.json(
    { error: "Konfigurasi COOKIE_CONSENT_SECRET belum tersedia di environment server." },
    { status: 503 },
  );
}

export async function GET(request: Request) {
  const rawCookie = request.headers.get("cookie")?.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
  const consent = decodeConsent(rawCookie);
  const response = NextResponse.json({ consent }, { headers: { "Cache-Control": "no-store" } });
  if (!COOKIE_SECRET) response.headers.set("X-Cookie-Consent-Setup", "missing-secret");
  return response;
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) {
    return NextResponse.json({ error: "Origin tidak diizinkan." }, { status: 403 });
  }
  if (!COOKIE_SECRET) return missingSecretResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 });
  }

  const input = body && typeof body === "object" && !Array.isArray(body)
    ? body as Record<string, unknown>
    : {};
  // Only category booleans are accepted. Cookie values and arbitrary client data are rejected.
  const categories = normalizeCategories(input.categories);
  if (!categories || Object.keys(input).some((key) => key !== "categories")) {
    return NextResponse.json({ error: "Pilihan kategori cookies tidak valid." }, { status: 400 });
  }

  const consent: StoredConsent = {
    version: 1,
    updatedAt: new Date().toISOString(),
    categories,
  };
  let encoded: string;
  try {
    encoded = encodeConsent(consent);
  } catch {
    return missingSecretResponse();
  }

  const response = NextResponse.json({
    consent: { updatedAt: consent.updatedAt, categories: consent.categories },
  }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set({
    name: COOKIE_NAME,
    value: encoded,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });

  // Telegram output is consolidated into /api/snap and sent only after separate explicit visitor-report consent.

  return response;
}
