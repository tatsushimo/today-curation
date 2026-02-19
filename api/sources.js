import { requireRedis } from "./_redis.js";

const KEY = "tc:sources:v1";

function json(res, status, body) {
  res.status(status);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function getToken(req) {
  return (
    req.headers["x-admin-token"] ||
    new URL(req.url, "http://localhost").searchParams.get("token") ||
    ""
  );
}

function assertAdmin(req) {
  const need = process.env.ADMIN_TOKEN || "";
  const got = String(getToken(req) || "");
  if (!need) throw new Error("ADMIN_TOKEN が未設定です（Vercelで追加してね）");
  if (got !== need) {
    const err = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
}

async function loadSources(r) {
  const raw = await r.get(KEY);
  if (!raw) return [];
  const v = typeof raw === "string" ? JSON.parse(raw) : raw;
  return Array.isArray(v) ? v : [];
}

async function saveSources(r, sources) {
  await r.set(KEY, JSON.stringify(sources));
}

export default async function handler(req, res) {
  try {
    const r = requireRedis();

    if (req.method === "GET") {
      assertAdmin(req);
      return json(res, 200, { sources: await loadSources(r) });
    }

    if (req.method === "POST") {
      assertAdmin(req);
      const body = await readJson(req);
      const url = String(body?.url || "").trim();
      const folder = String(body?.folder || "").trim();
      if (!url) return json(res, 400, { error: "url is required" });

      const sources = await loadSources(r);
      if (!sources.some((s) => s.url === url)) {
        sources.push({
          url,
          type: /youtube\.com|youtu\.be/.test(url) ? "youtube" : "site",
          folder: folder || null,
          createdAt: Date.now(),
        });
        await saveSources(r, sources);
      }
      return json(res, 200, { ok: true, sources });
    }

    if (req.method === "DELETE") {
      assertAdmin(req);
      const u = new URL(req.url, "http://localhost");
      const url = String(u.searchParams.get("url") || "").trim();
      if (!url) return json(res, 400, { error: "url query is required" });

      const sources = await loadSources(r);
      const next = sources.filter((s) => s.url !== url);
      await saveSources(r, next);
      return json(res, 200, { ok: true, sources: next });
    }

    return json(res, 405, { error: "Method Not Allowed" });
  } catch (e) {
    return json(res, e?.status || 500, { error: String(e?.message || e) });
  }
}

function readJson(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}
