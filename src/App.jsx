import React, { useEffect, useMemo, useState } from "react";

export default function App() {
  const [data, setData] = useState({ todayKey: "", items: [] });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

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
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function showToast(message, undo) {
    setToast({ message, undo });
    window.clearTimeout(window.__toastTimer);
    window.__toastTimer = window.setTimeout(() => setToast(null), 5000);
  }

  function removeLocal(id, kind) {
    setData((prev) => {
      const idx = prev.items.findIndex((x) => x.id === id);
      if (idx < 0) return prev;
      const removed = prev.items[idx];
      const nextItems = prev.items.filter((x) => x.id !== id);

      showToast(kind === "delete" ? "削除しました" : "保存しました（7日）", () => {
        setData((p2) => {
          if (p2.items.some((p) => p.id === removed.id)) return p2;
          const copy = [...p2.items];
          copy.splice(idx, 0, removed);
          return { ...p2, items: copy };
        });
      });

      return { ...prev, items: nextItems };
    });
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
        {loading ? <div style={styles.empty}>読み込み中…</div> : null}

        {!loading && data.items?.length === 0 ? (
          <div style={styles.empty}>今日の項目がありません</div>
        ) : null}

        {!loading &&
          (data.items || []).map((item) => (
            <Card
              key={item.id}
              item={item}
              onDelete={() => removeLocal(item.id, "delete")}
              onSave={() => removeLocal(item.id, "save")}
            />
          ))}
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

  const bg = swipeX > 10 ? "#FFECEC" : swipeX < -10 ? "#EEF6FF" : "transparent";

  const title = item.failed ? `取得失敗` : item.title;

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
        {item.thumb ? <img src={item.thumb} alt="" style={styles.thumb} /> : null}

        <div style={styles.title}>{title}</div>
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
      </div>

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
  headerLeft: { fontWeight: 700, textAlign: "center", letterSpacing: 0.5 },
  headerTitle: { fontSize: 18, fontWeight: 600, textAlign: "center" },
  headerBtn: { border: "none", background: "transparent", fontSize: 18, cursor: "pointer" },
  main: { padding: "16px 16px 96px", display: "flex", flexDirection: "column", gap: 24 },
  cardWrap: { position: "relative", borderRadius: 10 },
  card: { background: "transparent", touchAction: "pan-y" },
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
  swipeLabelRight: { position: "absolute", right: 12, top: 12, fontSize: 12, color: "#B00020", userSelect: "none" },
  swipeLabelLeft: { position: "absolute", left: 12, top: 12, fontSize: 12, color: "#0B5FFF", userSelect: "none" },
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
  toastBtn: { border: "none", background: "#fff", color: "#111", borderRadius: 10, padding: "8px 10px", fontWeight: 600, cursor: "pointer" },
  empty: { color: "#777", paddingTop: 24, textAlign: "center" },
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
