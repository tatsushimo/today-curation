import React, { useEffect, useMemo, useState } from "react";

export default function App() {
  const [data, setData] = useState({ todayKey: "", items: [] });
  const [loading, setLoading] = useState(true);

  const todayLabel = useMemo(() => {
    if (!data.todayKey) return "Today";
    const mmdd = data.todayKey.slice(5).replace("-", ".");
    return `Today ${mmdd}`;
  }, [data.todayKey]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const r = await fetch("/api/today");
        const j = await r.json();
        setData(j);
      } catch (e) {
        setData({
          todayKey: "",
          items: [
            {
              id: "error",
              title: "取得失敗（/api/today が動いていない）",
              url: "/api/today",
              date: "",
              thumb: null,
              failed: true,
            },
          ],
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>TC</div>
        <div style={styles.headerTitle}>{todayLabel}</div>
        <button style={styles.headerBtn} onClick={() => alert("設定（後で実装）")}>
          ⚙
        </button>
      </header>

      <main style={styles.main}>
        {loading ? <div style={styles.empty}>読み込み中…</div> : null}

        {!loading && (data.items || []).map((item) => (
          <Card key={item.id} item={item} />
        ))}
      </main>
    </div>
  );
}

function Card({ item }) {
  return (
    <section style={styles.cardWrap}>
      {item.thumb ? <img src={item.thumb} alt="" style={styles.thumb} /> : null}
      <div style={styles.title}>{item.failed ? "取得失敗" : item.title}</div>
      <div style={styles.meta}>{item.date}</div>

      <div style={styles.actions}>
        <button style={styles.actionBtn} onClick={() => alert("翻訳（次ステップ）")}>
          あ
        </button>
        <button style={styles.actionBtn} onClick={() => alert("要約（次ステップ）")}>
          …
        </button>
        <div style={{ flex: 1 }} />
        <button style={styles.linkBtn} onClick={() => window.open(item.url, "_blank")}>
          開く
        </button>
      </div>

      <div style={styles.divider} />
    </section>
  );
}

const styles = {
  page: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans JP", sans-serif',
    background: "#FAFAFA",
    minHeight: "100vh",
    color: "#111",
  },
  header: {
    position: "sticky",
    top: 0,
    height: 56,
    display: "grid",
    gridTemplateColumns: "56px 1fr 56px",
    alignItems: "center",
    background: "#FFFFFF",
    borderBottom: "1px solid #EEE",
    zIndex: 10,
  },
  headerLeft: { fontWeight: 700, textAlign: "center", letterSpacing: 0.5 },
  headerTitle: { fontSize: 18, fontWeight: 600, textAlign: "center" },
  headerBtn: { border: "none", background: "transparent", fontSize: 18, cursor: "pointer" },
  main: { padding: "16px 16px 96px", display: "flex", flexDirection: "column", gap: 24 },
  cardWrap: { position: "relative" },
  thumb: {
    width: "100%",
    height: 220,
    objectFit: "cover",
    borderRadius: 8,
    marginBottom: 12,
    display: "block",
  },
  title: { fontSize: 17, fontWeight: 600, lineHeight: 1.4, marginBottom: 8 },
  meta: { fontSize: 13, color: "#777", marginBottom: 12 },
  actions: { display: "flex", alignItems: "center", gap: 12 },
  actionBtn: { border: "none", background: "transparent", fontSize: 14, fontWeight: 500, color: "#555", padding: 0, cursor: "pointer" },
  linkBtn: { border: "none", background: "transparent", fontSize: 14, fontWeight: 500, color: "#111", padding: 0, cursor: "pointer" },
  divider: { marginTop: 20, borderBottom: "1px solid #EEE" },
  empty: { color: "#777", paddingTop: 24, textAlign: "center" },
};
