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

const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const dataFile = path.join(process.cwd(), "data", "shortlinks.json");
const slugPattern = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/;

function isExpired(record: ShortlinkRecord, now = Date.now()): boolean {
  const createdAt = Date.parse(record.createdAt);
  // Invalid timestamps are treated as expired so malformed records are not retained forever.
  return !Number.isFinite(createdAt) || now - createdAt >= RETENTION_MS;
}

async function readRecords(): Promise<ShortlinkRecord[]> {
  try {
    const parsed: unknown = JSON.parse(await fs.readFile(dataFile, "utf8"));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ShortlinkRecord =>
      item && typeof item.slug === "string" &&
      typeof item.destination === "string" &&
      typeof item.createdAt === "string"
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

/** Remove records whose seven-day retention period has elapsed. */
async function readAndPruneRecords(): Promise<ShortlinkRecord[]> {
  const records = await readRecords();
  const activeRecords = records.filter((record) => !isExpired(record));
  if (activeRecords.length !== records.length) {
    await writeRecords(activeRecords);
  }
  return activeRecords;
}

async function writeRecords(records: ShortlinkRecord[]) {
  await fs.mkdir(path.dirname(dataFile), { recursive: true });
  const tempFile = `${dataFile}.${process.pid}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(records, null, 2) + "\n", "utf8");
  await fs.rename(tempFile, dataFile);
}

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug")?.trim().toLowerCase();
  if (!slug || !slugPattern.test(slug)) {
    return NextResponse.json({ error: "Nama sublink tidak valid." }, { status: 400 });
  }

  try {
    const record = (await readAndPruneRecords()).find((item) => item.slug === slug);
    if (!record) return NextResponse.json({ error: "Sublink tidak ditemukan atau sudah kedaluwarsa." }, { status: 404 });
    return NextResponse.json({ slug: record.slug, destination: record.destination });
  } catch {
    return NextResponse.json({ error: "Gagal membaca atau membersihkan file penyimpanan." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 });
  }

  const input = body as { slug?: unknown; destination?: unknown };
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

  try {
    const records = await readAndPruneRecords();
    if (records.some((item) => item.slug === slug)) {
      return NextResponse.json({ error: "Nama sublink sudah digunakan. Pilih nama lain." }, { status: 409 });
    }

    const record: ShortlinkRecord = {
      slug,
      destination: destination.toString(),
      createdAt: new Date().toISOString(),
    };
    records.push(record);
    await writeRecords(records);
    return NextResponse.json({
      slug,
      destination: record.destination,
      createdAt: record.createdAt,
      expiresAt: new Date(Date.parse(record.createdAt) + RETENTION_MS).toISOString(),
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan JSON. Pastikan server memiliki izin tulis." }, { status: 500 });
  }
}
