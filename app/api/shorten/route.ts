import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { nanoid } from "nanoid";
import Url from "@/lib/models/Url";

const connectDB = async () => {
  if (mongoose.connections[0].readyState) return;
  await mongoose.connect(process.env.MONGODB_URI!);
};

export async function POST(req: Request) {
  try {
    await connectDB();
    const { longUrl } = await req.json();

    if (!longUrl) return NextResponse.json({ error: "URL is required" }, { status: 400 });

    const urlCode = nanoid(7);
    const shortUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/${urlCode}`;

    const newUrl = await Url.create({ urlCode, longUrl, shortUrl });
    return NextResponse.json(newUrl);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}