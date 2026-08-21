import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDb(uri = env.MONGODB_URI): Promise<typeof mongoose> {
  mongoose.set("strictQuery", true);
  return mongoose.connect(uri);
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
