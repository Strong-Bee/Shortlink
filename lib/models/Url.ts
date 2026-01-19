import mongoose, { Schema, Document, models, model } from "mongoose";

export interface IUrl extends Document {
  urlCode: string;
  longUrl: string;
  shortUrl: string;
  date: number;
}

const UrlSchema = new Schema<IUrl>({
  urlCode: { type: String, required: true, unique: true },
  longUrl: { type: String, required: true },
  shortUrl: { type: String, required: true },
  date: { type: Number, default: Date.now },
});

export default models.Url || model<IUrl>("Url", UrlSchema);