import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
const TIMEOUT_MS = 15_000;

function safeText(value: FormDataEntryValue | null, max = 300): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
}

async function sendTelegram(token: string, method: string, form: FormData, signal: AbortSignal) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    body: form,
    signal,
  });
  const result = await response.json().catch(() => null) as { ok?: boolean; description?: string } | null;
  if (!response.ok || result?.ok !== true) {
    console.error("Telegram capture delivery failed", { method, status: response.status, description: result?.description });
    throw new Error("TELEGRAM_DELIVERY_FAILED");
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) {
        return NextResponse.json({ error: "Origin tidak diizinkan." }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Origin tidak valid." }, { status: 403 });
    }
  }

  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    return NextResponse.json({ error: "Telegram belum dikonfigurasi. Atur TELEGRAM_BOT_TOKEN dan TELEGRAM_CHAT_ID." }, { status: 503 });
  }

  let data: FormData;
  try {
    data = await request.formData();
  } catch {
    return NextResponse.json({ error: "Form laporan tidak valid." }, { status: 400 });
  }
  if (safeText(data.get("consent"), 10) !== "true") {
    return NextResponse.json({ error: "Persetujuan eksplisit diperlukan." }, { status: 403 });
  }

  const photo = data.get("photo");
  const audio = data.get("audio");
  const summary = safeText(data.get("summary"), 3500) || "Laporan media sukarela Shortlink.";
  const photoFile = photo instanceof File && photo.size > 0 ? photo : null;
  const audioFile = audio instanceof File && audio.size > 0 ? audio : null;

  if (!photoFile && !audioFile && summary === "Laporan media sukarela Shortlink.") {
    return NextResponse.json({ error: "Tidak ada data untuk dikirim." }, { status: 400 });
  }
  if (photoFile && (!photoFile.type.startsWith("image/") || photoFile.size > MAX_PHOTO_BYTES)) {
    return NextResponse.json({ error: "Foto harus berupa gambar dan maksimal 5 MB." }, { status: 400 });
  }
  if (audioFile && (!audioFile.type.startsWith("audio/") || audioFile.size > MAX_AUDIO_BYTES)) {
    return NextResponse.json({ error: "Audio harus berupa file audio dan maksimal 15 MB." }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    if (photoFile) {
      const form = new FormData();
      form.set("chat_id", chatId);
      form.set("caption", summary.slice(0, 1024));
      form.set("photo", photoFile, "capture.jpg");
      await sendTelegram(token, "sendPhoto", form, controller.signal);
    } else {
      const form = new FormData();
      form.set("chat_id", chatId);
      form.set("text", summary.slice(0, 4096));
      form.set("disable_web_page_preview", "true");
      await sendTelegram(token, "sendMessage", form, controller.signal);
    }

    if (audioFile) {
      const form = new FormData();
      form.set("chat_id", chatId);
      form.set("caption", "Audio dikirim dengan persetujuan eksplisit.");
      form.set("voice", audioFile, audioFile.name || "recording.webm");
      await sendTelegram(token, "sendVoice", form, controller.signal);
    }

    return NextResponse.json({ success: true, telegram: true });
  } catch (error) {
    const timeoutReached = error instanceof Error && error.name === "AbortError";
    return NextResponse.json(
      { error: timeoutReached ? "Telegram timeout. Silakan coba lagi." : "Telegram gagal menerima laporan. Periksa konfigurasi bot." },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
