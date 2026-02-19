import { Redis } from "@upstash/redis";

function pickEnv(...keys) {
  for (const k of keys) {
    const v = process.env[k];
    if (v && String(v).trim()) return v;
  }
  return "";
}

// あなたの画面に出てた環境変数名に合わせて、まずこれだけ見ればOK
const url = pickEnv("KV_REST_API_URL");
const token = pickEnv("KV_REST_API_TOKEN");

export const redis = url && token ? new Redis({ url, token }) : null;

export function requireRedis() {
  if (!redis) throw new Error("Redis接続情報が見つかりません（KV_REST_API_URL/TOKEN を確認）");
  return redis;
}
