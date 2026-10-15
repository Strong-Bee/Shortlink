import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

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
  await fs.writeFile(tempFile, JSON.stringify(records, null, 2) + "\n", "utf8");
  await fs.rename(tempFile, dataFile);
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

function storageErrorResponse(error: unknown) {
  if (error instanceof Error && error.message === "PERSISTENT_STORAGE_REQUIRED") {
    return NextResponse.json(
      { error: "Penyimpanan persisten belum dikonfigurasi. Atur UPSTASH_REDIS_REST_URL dan UPSTASH_REDIS_REST_TOKEN di Vercel." },
      { status: 503 },
    );
  }
  return NextResponse.json(
    { error: "Penyimpanan gagal. Periksa konfigurasi Redis atau izin tulis file JSON." },
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
    return NextResponse.json({ slug: record.slug, destination: record.destination });
  } catch (error) {
    return storageErrorResponse(error);
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

    return NextResponse.json({
      slug: record.slug,
      destination: record.destination,
      createdAt: record.createdAt,
      expiresAt: new Date(Date.parse(record.createdAt) + RETENTION_MS).toISOString(),
    }, { status: 201 });
  } catch (error) {
    return storageErrorResponse(error);
  }
}
