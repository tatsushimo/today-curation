import React, { useEffect, useMemo, useState } from "react";

const LS_KEY = "tc_state_v1";
const KEEP_DAYS = 7;

export default function App() {
  const [data, setData] = useState({ todayKey: "", items: [] });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // localStorage state: { hidden: { [url]: true }, saved: { [url]: { item, savedAt } } }
  const [store, setStore] = useState(() => loadStore());

  const todayLabel = useMemo(() => {
    if (!data.todayKey) return "Today";
    const mmdd = data.todayKey.slice(5).replace("-", ".");
    return `Today ${mmdd}`;
  }, [data.todayKey]);

  // 初回：APIから今日の一覧を取得
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const r = await fetch("/api/today", { cache: "no-store" });
        const j = await r.json();
        setData(j);
      } catch (e) {
        setData({
          todayKey: "",
          items: [
            {
              id: "error",
              title: "取得失敗（/api/today）",
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

  // 保存（7日）期限切れを掃除
  useEffect(() => {
    const cleaned = cleanupExpiredSaved(store);
    if (cleaned !== store) setStore(cleaned);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // storeが変わるたび保存
  useEffect(() => {
    saveStore(store);
  }, [store]);

  function showToast(message, undo) {
    setToast({ message, undo });
    window.clearTimeout(window.__toastTimer);
    window.__toastTimer = window.setTimeout(() => setToast(null), 4500);
  }

  function hideItem(item) {
    const key = item.url; // 「タイトル変わってもURLが同じなら非表示のまま」でOK
    setStore((prev) => {
      const next = {
        ...prev,
        hidden: { ...(prev.hidden || {}), [key]: true },
      };
      return next;
    });

    showToast("非表示にしました", () => {
      setStore((prev) => {
        const hidden = { ...(prev.hidden || {}) };
        delete hidden[key];
        return { ...prev, hidden };
      });
    });
  }

  function saveForLater(item) {
    const key = item.url;
    const now = Date.now();
    setStore((prev) => {
      const next = {
        ...prev,
        saved: {
          ...(prev.saved || {}),
          [key]: { item, savedAt: now },
        },
      };
      return next;
    });

    showToast("あとで見るに保存（7日）", () => {
      setStore((prev) => {
        const saved = { ...(prev.saved || {}) };
        delete saved[key];
        return { ...prev, saved };
      });
    });
  }

  const visibleItems = useMemo(() => {
    const hidden = store.hidden || {};
    const saved = store.saved || {};
    return (data.items || []).filter((it) => !hidden[it.url] && !saved[it.url]);
  }, [data.items, store.hidden, store.saved]);

  const savedList = useMemo(() => {
    const saved = store.saved || {};
    const arr = Object.values(saved)
      .map((v) => v)
      .sort((a, b) => b.savedAt - a.savedAt);
    return arr;
  }, [store.saved]);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>TC</div>
        <div style={styles.headerTitle}>{todayLabel}</div>
        <button
          style={styles.headerBtn}
          onClick={() =>
            alert(
              `あとで見る：${savedList.length}件\n\n（次ステップで「あとで見る」画面を作ります）`
            )
          }
        >
          ⚙
        </button>
      </header>

      <main style={styles.main}>
        {loading ? <div style={styles.empty}>読み込み中…</div> : null}

        {!loading && visibleItems.length === 0 ? (
          <div style={styles.empty}>今日の項目がありません</div>
        ) : null}

        {!loading &&
          visibleItems.map((item) => (
            <SwipeCard
              key={item.id + item.url}
              item={item}
              onRight={() => hideItem(item)} // 右=削除/非表示
              onLeft={() => saveForLater(item)} // 左=あとで見る
            />
          ))}

        {/* 下に「あとで見る」を一旦リスト表示（軽量版） */}
        {savedList.length > 0 ? (
          <section style={styles.savedBox}>
            <div style={styles.savedTitle}>あとで見る（7日）</div>
            <div style={styles.savedHint}>
              ※ 左スワイプで入ります。期限切れは自動で消えます。
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {savedList.map(({ item, savedAt }) => (
                <div key={item.url} style={styles.savedRow}>
                  <div style={{ fontWeight: 600, lineHeight: 1.3 }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 12, color: "#777" }}>
                    保存日: {fmtDate(savedAt)} / 期限: {fmtDate(savedAt + KEEP_DAYS * 86400000)}
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                    <button
                      style={styles.miniBtn}
                      onClick={() => window.open(item.url, "_blank")}
                    >
                      開く
                    </button>
                    <button
                      style={styles.miniBtnGhost}
                      onClick={() => {
                        const key = item.url;
                        setStore((prev) => {
                          const saved = { ...(prev.saved || {}) };
                          delete saved[key];
                          return { ...prev, saved };
                        });
                      }}
                    >
                      解除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
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

function SwipeCard({ item, onRight, onLeft }) {
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
    setSwipeX((x) => clamp(x + dx, -140, 140));
  }
  function onPointerUp() {
    if (!dragging) return;
    setDragging(false);

    // 左=あとで見る / 右=非表示
    if (swipeX > 90) onRight();
    else if (swipeX < -90) onLeft();

    setSwipeX(0);
  }

  const bg =
    swipeX > 10 ? "#FFECEC" : swipeX < -10 ? "#EEF6FF" : "transparent";

  return (
    <section style={{ ...styles.cardWrap, background: bg }}>
      <div
        style={{
          ...styles.card,
          transform: `translateX(${swipeX}px)`,
          transition: dragging ? "none" : "transform 160ms ease",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
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
      </div>

      {swipeX > 10 ? <div style={styles.swipeLabelRight}>右＝非表示</div> : null}
      {swipeX < -10 ? <div style={styles.swipeLabelLeft}>左＝あとで見る</div> : null}
    </section>
  );
}

// -------- localStorage helpers --------
function loadStore() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { hidden: {}, saved: {} };
    const parsed = JSON.parse(raw);
    return {
      hidden: parsed.hidden || {},
      saved: parsed.saved || {},
    };
  } catch {
    return { hidden: {}, saved: {} };
  }
}

function saveStore(store) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}

function cleanupExpiredSaved(store) {
  const saved = store.saved || {};
  const now = Date.now();
  let changed = false;
  const nextSaved = { ...saved };

  for (const [url, v] of Object.entries(saved)) {
    const savedAt = v?.savedAt || 0;
    if (!savedAt) continue;
    if (now - savedAt > KEEP_DAYS * 86400000) {
      delete nextSaved[url];
      changed = true;
    }
  }

  if (!changed) return store;
  return { ...store, saved: nextSaved };
}

// -------- utils --------
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function fmtDate(ms) {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
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

  main: { padding: "16px 16px 120px", display: "flex", flexDirection: "column", gap: 24 },

  cardWrap: { position: "relative", borderRadius: 10 },
  card: { background: "transparent", touchAction: "pan-y" },
  thumb: {
    width: "100%",
    height: 220,
    objectFit: "cover",
    borderRadius: 10,
    marginBottom: 12,
    display: "block",
  },
  title: { fontSize: 17, fontWeight: 650, lineHeight: 1.45, marginBottom: 8 },
  meta: { fontSize: 13, color: "#777", marginBottom: 12 },

  actions: { display: "flex", alignItems: "center", gap: 12 },
  actionBtn: { border: "none", background: "transparent", fontSize: 14, fontWeight: 500, color: "#555", padding: 0, cursor: "pointer" },
  linkBtn: { border: "none", background: "transparent", fontSize: 14, fontWeight: 650, color: "#111", padding: 0, cursor: "pointer" },
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
  toastBtn: { border: "none", background: "#fff", color: "#111", borderRadius: 10, padding: "8px 10px", fontWeight: 700, cursor: "pointer" },
  empty: { color: "#777", paddingTop: 24, textAlign: "center" },

  savedBox: {
    marginTop: 6,
    background: "#fff",
    border: "1px solid #EEE",
    borderRadius: 12,
    padding: 14,
  },
  savedTitle: { fontWeight: 800, marginBottom: 6 },
  savedHint: { fontSize: 12, color: "#777", marginBottom: 12 },
  savedRow: {
    border: "1px solid #EEE",
    borderRadius: 12,
    padding: 12,
    background: "#FAFAFA",
  },
  miniBtn: {
    border: "none",
    borderRadius: 10,
    padding: "8px 10px",
    background: "#111",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
  miniBtnGhost: {
    border: "1px solid #DDD",
    borderRadius: 10,
    padding: "8px 10px",
    background: "#fff",
    color: "#111",
    fontWeight: 700,
    cursor: "pointer",
  },
};
