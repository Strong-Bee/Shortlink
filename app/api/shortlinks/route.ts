import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { sendTelegramNotification } from "@/lib/telegram-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ShortlinkRecord = {
  slug: string;
  destination: string;
  createdAt: string;
};

const RETENTION_SECONDS = 7 * 24 * 60 * 60;
const RETENTION_MS = RETENTION_SECONDS * 1000;
const dataFile = path.join(process.cwd(), "data", "shortlinks.json");
const slugPattern = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/;
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

function isExpired(record: ShortlinkRecord, now = Date.now()): boolean {
  const createdAt = Date.parse(record.createdAt);
  return !Number.isFinite(createdAt) || now - createdAt >= RETENTION_MS;
}

function redisKey(slug: string): string {
  return `shortlink:${slug}`;
}

function isVercelWithoutRedis(): boolean {
  return process.env.VERCEL === "1" && !redis;
}

async function readLocalRecords(): Promise<ShortlinkRecord[]> {
  try {
    const parsed: unknown = JSON.parse(await fs.readFile(dataFile, "utf8"));
    if (!Array.isArray(parsed)) throw new Error("File JSON harus berisi array.");
    return parsed.filter((item): item is ShortlinkRecord =>
      item &&
      typeof item.slug === "string" &&
      typeof item.destination === "string" &&
      typeof item.createdAt === "string"
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeLocalRecords(records: ShortlinkRecord[]): Promise<void> {
  await fs.mkdir(path.dirname(dataFile), { recursive: true });
  const tempFile = `${dataFile}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fs.writeFile(tempFile, JSON.stringify(records, null, 2) + "\n", "utf8");
    await fs.rename(tempFile, dataFile);
  } catch (error) {
    await fs.rm(tempFile, { force: true }).catch(() => undefined);
    throw error;
  }
}
async function readAndPruneLocalRecords(): Promise<ShortlinkRecord[]> {
  const records = await readLocalRecords();
  const activeRecords = records.filter((record) => !isExpired(record));
  if (activeRecords.length !== records.length) {
    await writeLocalRecords(activeRecords);
  }
  return activeRecords;
}

async function findRecord(slug: string): Promise<ShortlinkRecord | null> {
  if (redis) {
    const value = await redis.get<string>(redisKey(slug));
    if (!value) return null;

    const record = typeof value === "string" ? JSON.parse(value) as ShortlinkRecord : value as unknown as ShortlinkRecord;
    return record && record.slug === slug && typeof record.destination === "string" ? record : null;
  }

  if (isVercelWithoutRedis()) {
    throw new Error("PERSISTENT_STORAGE_REQUIRED");
  }

  return (await readAndPruneLocalRecords()).find((record) => record.slug === slug) ?? null;
}

async function createRecord(record: ShortlinkRecord): Promise<boolean> {
  if (redis) {
    const result = await redis.set(
      redisKey(record.slug),
      JSON.stringify(record),
      { nx: true, ex: RETENTION_SECONDS },
    );
    return result === "OK";
  }

  if (isVercelWithoutRedis()) {
    throw new Error("PERSISTENT_STORAGE_REQUIRED");
  }

  const records = await readAndPruneLocalRecords();
  if (records.some((item) => item.slug === record.slug)) return false;
  records.push(record);
  await writeLocalRecords(records);
  return true;
}

function storageErrorResponse(error: unknown, operation: "read" | "write") {
  if (error instanceof Error && error.message === "PERSISTENT_STORAGE_REQUIRED") {
    return NextResponse.json(
      { error: "Penyimpanan persisten belum dikonfigurasi. Atur UPSTASH_REDIS_REST_URL dan UPSTASH_REDIS_REST_TOKEN di Vercel.", code: "PERSISTENT_STORAGE_REQUIRED" },
      { status: 503 },
    );
  }

  // Keep provider details in server logs only. Never return Redis credentials,
  // connection strings, filesystem paths, or raw provider errors to visitors.
  const cause = error instanceof Error ? error : new Error(String(error));
  const networkCause = cause.cause;
  const networkError = networkCause && typeof networkCause === "object"
    ? networkCause as { name?: unknown; code?: unknown; message?: unknown }
    : null;
  console.error("[shortlinks] Storage operation failed", {
    operation,
    backend: redis ? "upstash-redis" : "local-json",
    errorName: cause.name,
    errorMessage: cause.message.slice(0, 300),
    causeName: typeof networkError?.name === "string" ? networkError.name : undefined,
    causeCode: typeof networkError?.code === "string" ? networkError.code : undefined,
    causeMessage: typeof networkError?.message === "string" ? networkError.message.slice(0, 200) : undefined,
  });

  return NextResponse.json(
    {
      error: redis
        ? "Penyimpanan Redis gagal. Periksa URL, token, status database Upstash, dan log runtime Vercel."
        : "Penyimpanan file JSON gagal. Periksa izin tulis direktori data dan log server.",
      code: "STORAGE_OPERATION_FAILED",
    },
    { status: 500 },
  );
}

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug")?.trim().toLowerCase();
  if (!slug || !slugPattern.test(slug)) {
    return NextResponse.json({ error: "Nama sublink tidak valid." }, { status: 400 });
  }

  try {
    const record = await findRecord(slug);
    if (!record || isExpired(record)) {
      return NextResponse.json({ error: "Sublink tidak ditemukan atau sudah kedaluwarsa." }, { status: 404 });
    }
    const reportConsent = new URL(request.url).searchParams.get("report") === "1";
    const now = new Date();
    const lines = [
      reportConsent ? "👁️ LAPORAN KUNJUNGAN SHORTLINK" : "👁️ SHORTLINK DIKUNJUNGI",
      "",
      `Slug: ${record.slug}`,
      `Waktu: ${now.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB`,
    ];

    if (reportConsent) {
      const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
      const realIp = request.headers.get("x-real-ip")?.trim() || "";
      const ip = /^\\d{1,3}(?:\\.\\d{1,3}){3}$/.test(forwarded) || forwarded.includes(":")
        ? forwarded : realIp;
      let geo: Record<string, string> = {};
      const token = process.env.IPINFO_TOKEN;
      if (token && ip) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2500);
        try {
          const response = await fetch(
            `https://ipinfo.io/${encodeURIComponent(ip)}/json?token=${encodeURIComponent(token)}`,
            { signal: controller.signal, cache: "no-store" },
          );
          if (response.ok) {
            const data = await response.json() as Record<string, unknown>;
            for (const key of ["city", "region", "country", "org", "timezone"]) {
              if (typeof data[key] === "string") geo[key] = (data[key] as string).slice(0, 120);
            }
          }
        } catch {
          // Approximate IP geolocation is optional and may be unavailable.
        } finally {
          clearTimeout(timeout);
        }
      }
      const ua = request.headers.get("user-agent") || "Tidak tersedia";
      const language = request.headers.get("accept-language") || "Tidak tersedia";
      const clientHints = request.headers.get("sec-ch-ua") || "Tidak tersedia";
      const platform = request.headers.get("sec-ch-ua-platform") || "Tidak tersedia";
      const mobile = request.headers.get("sec-ch-ua-mobile") || "Tidak tersedia";
      const device = /tablet|ipad/i.test(ua) ? "Tablet" : /mobile|android|iphone/i.test(ua) ? "Mobile" : "Desktop/Unknown";
      const browser = /Edg\\//i.test(ua) ? "Microsoft Edge" : /Firefox\\//i.test(ua) ? "Firefox"
        : /Chrome\\//i.test(ua) ? "Chrome/Chromium" : /Safari\\//i.test(ua) ? "Safari" : "Tidak teridentifikasi";
      const os = /Android/i.test(ua) ? "Android" : /iPhone|iPad|iPod/i.test(ua) ? "iOS"
        : /Windows/i.test(ua) ? "Windows" : /Mac OS|Macintosh/i.test(ua) ? "macOS"
        : /Linux/i.test(ua) ? "Linux" : "Tidak teridentifikasi";
      lines.push(
        "",
        "— JARINGAN & LOKASI PERKIRAAN —",
        `IP publik: ${ip || "Tidak tersedia"}`,
        `Kota: ${geo.city || "Tidak tersedia"}`,
        `Wilayah: ${geo.region || "Tidak tersedia"}`,
        `Negara: ${geo.country || "Tidak tersedia"}`,
        `ISP/Organisasi: ${geo.org || "Tidak tersedia"}`,
        `Zona waktu IP: ${geo.timezone || "Tidak tersedia"}`,
        "",
        "— PERANGKAT & BROWSER —",
        `Jenis perangkat: ${device}`,
        `Browser (perkiraan UA): ${browser}`,
        `OS (perkiraan UA): ${os}`,
        `Client hints browser: ${clientHints}`,
        `Platform client hints: ${platform}`,
        `Mobile client hint: ${mobile}`,
        `User-Agent: ${ua.slice(0, 500)}`,
        `Bahasa browser: ${language.slice(0, 200)}`,
        "",
        "Persetujuan laporan tambahan: diberikan secara eksplisit.",
        "Lokasi hanya perkiraan dari IP; bukan GPS. Tidak ada kamera, mikrofon, foto, atau audio yang diakses.",
      );
    } else {
      lines.push("", "Pengunjung memilih lanjut tanpa laporan tambahan.");
    }
    await sendTelegramNotification(lines.join("\\n"));
    return NextResponse.json({ slug: record.slug, destination: record.destination });
  } catch (error) {
    return storageErrorResponse(error, "read");
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 });
  }

  const input = body && typeof body === "object" ? body as { slug?: unknown; destination?: unknown } : {};
  const slug = typeof input.slug === "string" ? input.slug.trim().toLowerCase() : "";
  const destinationText = typeof input.destination === "string" ? input.destination.trim() : "";

  if (!slugPattern.test(slug)) {
    return NextResponse.json({ error: "Nama hanya boleh berisi huruf kecil, angka, dan tanda hubung." }, { status: 400 });
  }

  let destination: URL;
  try {
    destination = new URL(destinationText);
  } catch {
    return NextResponse.json({ error: "URL tujuan tidak valid." }, { status: 400 });
  }
  if (destination.protocol !== "https:" && destination.protocol !== "http:") {
    return NextResponse.json({ error: "Hanya URL HTTP dan HTTPS yang didukung." }, { status: 400 });
  }

  const record: ShortlinkRecord = {
    slug,
    destination: destination.toString(),
    createdAt: new Date().toISOString(),
  };

  try {
    const created = await createRecord(record);
    if (!created) {
      return NextResponse.json({ error: "Nama sublink sudah digunakan. Pilih nama lain." }, { status: 409 });
    }

    // Notify the owner only after persistent storage confirms creation.
    // Strip query strings and fragments because destination URLs may contain secrets.
    const safeDestination = new URL(record.destination);
    const destinationSummary = `${safeDestination.origin}${safeDestination.pathname}`;
    const shortlinkOrigin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const telegramStatus = await sendTelegramNotification([
      "🔗 SHORTLINK BERHASIL DIBUAT",
      "",
      `Slug: ${record.slug}`,
      `Shortlink: ${shortlinkOrigin.replace(/\/$/, "")}/${record.slug}`,
      `Tujuan: ${destinationSummary}`,
      `Dibuat: ${new Date(record.createdAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB`,
      `Penyimpanan: ${redis ? "Upstash Redis" : "Local JSON"}`,
    ].join("\n"));

    return NextResponse.json({
      slug: record.slug,
      destination: record.destination,
      createdAt: record.createdAt,
      expiresAt: new Date(Date.parse(record.createdAt) + RETENTION_MS).toISOString(),
      telegramNotification: telegramStatus,
    }, { status: 201 });
  } catch (error) {
    return storageErrorResponse(error, "write");
  }
}
