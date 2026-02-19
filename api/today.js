import { XMLParser } from "fast-xml-parser";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  try {
    const items = [];

    // 1) PRESIDENT（RSS）
    items.push(await fetchLatestFromRss({
      id: "president",
      rssUrl: "https://president.jp/list/rss",
      fallbackUrl: "https://president.jp/",
      kind: "site",
    }));

    // 2) ITmedia（RSS）
    items.push(await fetchLatestFromRss({
      id: "itmedia",
      rssUrl: "https://rss.itmedia.co.jp/rss/2.0/itmedia_all.xml",
      fallbackUrl: "https://www.itmedia.co.jp/",
      kind: "site",
    }));

    // 3) Pentawards（HTML）
    items.push(await fetchLatestFromHtml({
      id: "pentawards",
      pageUrl: "https://pentawards.com/live/ja/page/news",
      kind: "site",
      // まずは「一番上のリンクっぽいもの」を拾う軽い方式（壊れたら後で調整）
    }));

    // 4) Powerweb（HTML）
    items.push(await fetchLatestFromHtml({
      id: "powerweb",
      pageUrl: "https://www.powerweb.co.jp/blog/",
      kind: "site",
    }));

    // 5) YouTube（今回はまだデモ：次ステップでAPI実装）
    items.push({
      id: "youtube_datu",
      kind: "youtube",
      title: "YouTube（次ステップで実装）: @datu-sugawara",
      url: "https://www.youtube.com/@datu-sugawara",
      date: isoToday(),
      thumb: null
    });

    // 今日の号ラベル（7:00 JST基準の“日付キー”だけ先に実装）
    // ※「その日ずっと固定」の完全版は、次の段階でキャッシュ/保存先を追加して作る
    const todayKey = jstTodayKeyAt0700();

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).json({ todayKey, items });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}

async function fetchLatestFromRss({ id, rssUrl, fallbackUrl, kind }) {
  const xml = await fetchText(rssUrl);
  const parser = new XMLParser({ ignoreAttributes: false });
  const data = parser.parse(xml);

  // RSS 2.0 / Atom どちらもざっくり拾えるように
  const channel = data?.rss?.channel;
  const rssItems = channel?.item ? (Array.isArray(channel.item) ? channel.item : [channel.item]) : null;

  if (rssItems && rssItems.length) {
    const it = rssItems[0];
    return normalizeItem({
      id,
      kind,
      title: safeText(it.title) || "(no title)",
      url: safeText(it.link) || fallbackUrl,
      date: safeDate(it.pubDate) || isoToday(),
      thumb: null,
    });
  }

  // Atom fallback
  const feed = data?.feed;
  const entries = feed?.entry ? (Array.isArray(feed.entry) ? feed.entry : [feed.entry]) : null;
  if (entries && entries.length) {
    const en = entries[0];
    const link = Array.isArray(en.link) ? en.link[0]?.["@_href"] : en.link?.["@_href"];
    return normalizeItem({
      id,
      kind,
      title: safeText(en.title) || "(no title)",
      url: link || fallbackUrl,
      date: safeDate(en.updated) || safeDate(en.published) || isoToday(),
      thumb: null,
    });
  }

  // 取れないとき
  return normalizeItem({
    id,
    kind,
    title: "取得失敗（RSS）",
    url: fallbackUrl,
    date: isoToday(),
    thumb: null,
    failed: true,
  });
}

async function fetchLatestFromHtml({ id, pageUrl, kind }) {
  const html = await fetchText(pageUrl);
  const $ = cheerio.load(html);

  // とにかく「最初に見つかった記事リンク」を拾う軽量版
  //（壊れたら、そのサイト専用にセレクタを固める）
  const a = $("a[href]").filter((_, el) => {
    const href = $(el).attr("href") || "";
    // それっぽい記事リンクを優先（雑に）
    return href.includes("http") || href.startsWith("/");
  }).first();

  let href = a.attr("href") || pageUrl;
  if (href.startsWith("/")) {
    const u = new URL(pageUrl);
    href = `${u.origin}${href}`;
  }

  const title = a.text().trim() || $("title").text().trim() || "（タイトル不明）";

  // OGP画像（あれば）をサムネに
  const og = $('meta[property="og:image"]').attr("content") || null;

  return normalizeItem({
    id,
    kind,
    title,
    url: href,
    date: isoToday(),
    thumb: og,
  });
}

function normalizeItem(x) {
  return {
    id: x.id,
    kind: x.kind,
    title: x.title,
    url: x.url,
    date: x.date,
    thumb: x.thumb ?? null,
    failed: !!x.failed,
  };
}

async function fetchText(url) {
  const r = await fetch(url, { headers: { "User-Agent": "today-curation/1.0" } });
  if (!r.ok) throw new Error(`Fetch failed: ${url} (${r.status})`);
  return await r.text();
}

function safeText(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  // fast-xml-parserが { "#text": "..."} みたいに返すことがある
  if (typeof v === "object" && v["#text"]) return String(v["#text"]);
  return "";
}

function safeDate(v) {
  const s = safeText(v);
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

// 7:00(JST)を境に “今日キー” を決める（表示用）
// 例：02/19 06:30は「02/18」扱い、07:01は「02/19」扱い
function jstTodayKeyAt0700() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = jst.getUTCFullYear();
  const m = jst.getUTCMonth();
  const d = jst.getUTCDate();
  const hh = jst.getUTCHours();

  const keyDate = new Date(Date.UTC(y, m, d, 0, 0, 0));
  if (hh < 7) keyDate.setUTCDate(keyDate.getUTCDate() - 1);
  return keyDate.toISOString().slice(0, 10);
}
