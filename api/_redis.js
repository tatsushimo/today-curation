import { Redis } from "@upstash/redis";

const url = process.env.KV_REST_API_URL;
const token = process.env.KV_REST_API_TOKEN;

export const redis = url && token ? new Redis({ url, token }) : null;

export function requireRedis() {
  if (!redis) throw new Error("Redis接続情報が見つかりません（KV_REST_API_URL/TOKEN を確認）");
  return redis;
}
