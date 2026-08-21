import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import request from "supertest";
import { createApp } from "../app.js";

export const app = createApp();
let replica: MongoMemoryReplSet | undefined;

const dockerUri =
  process.env.TEST_MONGODB_URI ??
  "mongodb://127.0.0.1:27018/fleetify-test?directConnection=true";

async function connectDocker(): Promise<boolean> {
  try {
    await mongoose.connect(dockerUri, { serverSelectionTimeoutMS: 2500 });
    return true;
  } catch {
    await mongoose.disconnect().catch(() => undefined);
    return false;
  }
}

export async function startTestDb(): Promise<void> {
  if (await connectDocker()) return;
  replica = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  await mongoose.connect(replica.getUri("fleetify-test"));
}

export async function stopTestDb(): Promise<void> {
  await mongoose.disconnect();
  if (replica) await replica.stop();
}

export async function resetDb(): Promise<void> {
  const collections = await mongoose.connection.db?.collections();
  if (!collections) return;
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

export async function authToken(): Promise<string> {
  const res = await request(app).post("/api/auth/setup").send({
    email: "admin@fleetify.local",
    password: "ChangeMeNow!23",
    name: "Test Admin",
  });
  return res.body.token as string;
}
