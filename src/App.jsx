import React, { useMemo, useState } from "react";
import dayjs from "dayjs";

const demoItems = [
  {
    id: "president",
    title: "PRESIDENT Online: 記事タイトル（デモ）",
    date: dayjs().format("YYYY.MM.DD"),
    thumb: null,
    url: "https://president.jp/",
  },
  {
    id: "pentawards",
    title: "Pentawards News: Packaging Trends 2026 (demo)",
    date: dayjs().format("YYYY.MM.DD"),
    thumb:
      "https://images.unsplash.com/photo-1526481280695-3c687fd5432c?w=1200&auto=format&fit=crop",
    url: "https://pentawards.com/live/ja/page/news-",
  },
  {
    id: "yt",
    title: "YouTube: 新着動画タイトル（デモ）",
    date: dayjs().format("YYYY.MM.DD"),
    thumb:
      "https://images.unsplash.com/photo-1525182008055-f88b95ff7980?w=1200&auto=format&fit=crop",
    url: "https://www.youtube.com/@datu-sugawara",
  },
];

export default function App() {
  const todayLabel = useMemo(() => `Today ${dayjs().format("MM.DD")}`, []);
  const [items, setItems] = useState(demoItems);
  const [toast, setToast] = useState(null);

  function undoableRemove(id, kind) {
    const idx = items.findIndex((x) => x.id === id);
    if (idx < 0) return;
    const removed = items[idx];
    const next = items.filter((x) => x.id !== id);
    setItems(next);
    setToast({
      message: kind === "delete" ? "削除しました" : "保存しました（7日）",
      undo: () => setItems((prev) => {
        // すでに戻ってたら二重追加しない
        if (prev.some((p) => p.id === removed.id)) return prev;
        const copy = [...prev];
        copy.splice(idx, 0, removed);
        return copy;
      }),
    });
    window.clearTimeout(window.__toastTimer);
    window.__toastTimer = window.setTimeout(() => setToast(null), 5000);
  }

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
        {items.map((item) => (
          <Card
            key={item.id}
            item={item}
            onDelete={() => undoableRemove(item.id, "delete")}
            onSave={() => undoableRemove(item.id, "save")}
          />
        ))}
        {items.length === 0 && (
          <div style={styles.empty}>今日の項目がありません</div>
        )}
      </main>

      {toast && (
        <div style={styles.toast}>
          <div>{toast.message}</div>
          <button style={styles.toastBtn} onClick={toast.undo}>
            元に戻す
          </button>
        </div>
      )}
    </div>
  );
}

function Card({ item, onDelete, onSave }) {
  const [swipeX, setSwipeX] = useState(0);
  const [dragging, setDragging] = useState(false);

  function onPointerDown(e) {
    setDragging(true);
    setSwipeX(0);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e) {
    if (!dragging) return;
    const dx = e.movementX ?? 0;
    setSwipeX((x) => clamp(x + dx, -120, 120));
  }
  function onPointerUp() {
    if (!dragging) return;
    setDragging(false);
    if (swipeX > 80) onDelete(); // 右=削除
    else if (swipeX < -80) onSave(); // 左=保存
    setSwipeX(0);
  }

  const bg =
    swipeX > 10
      ? "#FFECEC"
      : swipeX < -10
      ? "#EEF6FF"
      : "transparent";

  return (
    <section style={{ ...styles.cardWrap, background: bg }}>
      <div
        style={{
          ...styles.card,
          transform: `translateX(${swipeX}px)`,
          transition: dragging ? "none" : "transform 180ms ease",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {item.thumb ? (
          <img src={item.thumb} alt="" style={styles.thumb} />
        ) : null}

        <div style={styles.title}>{item.title}</div>
        <div style={styles.meta}>{item.date}</div>

        <div style={styles.actions}>
          <button style={styles.actionBtn} onClick={() => alert("翻訳（後で実装）")}>
            あ
          </button>
          <button style={styles.actionBtn} onClick={() => alert("要約（後で実装）")}>
            …
          </button>
          <div style={{ flex: 1 }} />
          <button style={styles.linkBtn} onClick={() => window.open(item.url, "_blank")}>
            開く
          </button>
        </div>

        <div style={styles.divider} />
      </div>

      {/* スワイプ中のラベル */}
      {swipeX > 10 ? <div style={styles.swipeLabelRight}>削除</div> : null}
      {swipeX < -10 ? <div style={styles.swipeLabelLeft}>保存</div> : null}
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
  headerLeft: {
    fontWeight: 700,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  headerTitle: { fontSize: 18, fontWeight: 600, textAlign: "center" },
  headerBtn: {
    border: "none",
    background: "transparent",
    fontSize: 18,
    cursor: "pointer",
  },
  main: {
    padding: "16px 16px 96px",
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  cardWrap: {
    position: "relative",
    borderRadius: 10,
  },
  card: {
    background: "transparent",
    touchAction: "pan-y",
  },
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
  actionBtn: {
    border: "none",
    background: "transparent",
    fontSize: 14,
    fontWeight: 500,
    color: "#555",
    padding: 0,
    cursor: "pointer",
  },
  linkBtn: {
    border: "none",
    background: "transparent",
    fontSize: 14,
    fontWeight: 500,
    color: "#111",
    padding: 0,
    cursor: "pointer",
  },
  divider: {
    marginTop: 20,
    borderBottom: "1px solid #EEE",
  },
  swipeLabelRight: {
    position: "absolute",
    right: 12,
    top: 12,
    fontSize: 12,
    color: "#B00020",
    userSelect: "none",
  },
  swipeLabelLeft: {
    position: "absolute",
    left: 12,
    top: 12,
    fontSize: 12,
    color: "#0B5FFF",
    userSelect: "none",
  },
  toast: {
    position: "fixed",
    left: 16,
    right: 16,
    bottom: 16,
    background: "#111",
    color: "#fff",
    borderRadius: 12,
    padding: "12px 14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  toastBtn: {
    border: "none",
    background: "#fff",
    color: "#111",
    borderRadius: 10,
    padding: "8px 10px",
    fontWeight: 600,
    cursor: "pointer",
  },
  empty: { color: "#777", paddingTop: 24, textAlign: "center" },
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
