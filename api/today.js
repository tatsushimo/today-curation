import { XMLParser } from "fast-xml-parser";

const SOURCES = [
  // 例：あなたが入れてたやつ（サイト側の処理は既存のままでOK。ここではYouTubeだけ本実装）
  { type: "youtube", url: "https://www.youtube.com/@datu-sugawara" },

  // ここに他のサイトソースがあるなら、あなたの既存コードのまま残してOK
  // { type: "rss", url: "..." },
  // { type: "html", url: "..." },
];

export default async function handler(req, res) {
  try {
    const todayKey = new Date().toISOString().slice(0, 10);

    const items = [];
    for (const s of SOURCES) {
      if (s.type === "youtube") {
        const it = await fetchYouTubeLatest(s.url);
        if (it) items.push(it);
      } else {
        // 既存のRSS/HTML処理があるなら、ここにあなたの処理を残してOK
        // items.push(await fetchRssLatest(s.url)) など
      }
    }

    res.status(200).json({ todayKey, items });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}

/**
 * YouTubeチャンネル(ハンドルURL or channelId)の最新動画をRSSから取得
 * 対応:
 *  - https://www.youtube.com/@handle
 *  - channelId (UCxxxx...)
 */
async function fetchYouTubeLatest(handleUrlOrId) {
  const channelId = await resolveYouTubeChannelId(handleUrlOrId);
  if (!channelId) return null;

  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const xml = await fetchText(feedUrl);

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const obj = parser.parse(xml);
  const feed = obj?.feed;
  let entry = feed?.entry;

  if (!entry) return null;
  // entryが配列/単体どっちでも対応
  if (Array.isArray(entry)) entry = entry[0];

  const title = entry?.title ?? "YouTube 最新動画";
  const link =
    entry?.link?.["@_href"] ||
    (Array.isArray(entry?.link) ? entry.link[0]?.["@_href"] : null) ||
    null;

  const published = entry?.published ? entry.published.slice(0, 10) : new Date().toISOString().slice(0, 10);

  // サムネ（media:group → media:thumbnail）
  const thumb =
    entry?.["media:group"]?.["media:thumbnail"]?.["@_url"] ||
    (Array.isArray(entry?.["media:group"]?.["media:thumbnail"])
      ? entry["media:group"]["media:thumbnail"][0]?.["@_url"]
      : null) ||
    null;

  return {
    id: `yt:${channelId}`,
    title: `YouTube: ${title}`,
    url: link || `https://www.youtube.com/channel/${channelId}`,
    date: published,
    thumb,
  };
}

async function resolveYouTubeChannelId(input) {
  // すでにUC...が来ている場合
  if (typeof input === "string" && input.startsWith("UC")) return input;

  // URLからいろいろ吸収
  const url = String(input || "");
  // /channel/UCxxxx
  const m1 = url.match(/youtube\.com\/channel\/(UC[a-zA-Z0-9_-]+)/);
  if (m1?.[1]) return m1[1];

  // /@handle の場合：チャンネルページHTMLから channelId を抜く
  const pageUrl = url.includes("youtube.com") ? url : `https://www.youtube.com/${url}`;
  const html = await fetchText(pageUrl);

  // よくある形："channelId":"UCxxxx"
  const m2 = html.match(/"channelId":"(UC[a-zA-Z0-9_-]+)"/);
  if (m2?.[1]) return m2[1];

  // 保険：externalId / browseId の形
  const m3 = html.match(/"externalId":"(UC[a-zA-Z0-9_-]+)"/);
  if (m3?.[1]) return m3[1];

  return null;
}

async function fetchText(url) {
  const r = await fetch(url, {
    headers: {
      "User-Agent": "today-curation/1.0",
      "Accept": "text/html,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  if (!r.ok) throw new Error(`Fetch failed ${r.status} ${url}`);
  return await r.text();
}
