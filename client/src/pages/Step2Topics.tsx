import { useState, useEffect, useRef } from "react";
import type { SiteConfig, TopicIdea, WrittenArticle, LogLine } from "../lib/types";

interface Props {
  siteConfig: SiteConfig;
  existingTopics: TopicIdea[];
  existingArticles: WrittenArticle[];
  existingLog: LogLine[];
  isWriting: boolean;
  onTopicsChange: (topics: TopicIdea[]) => void;
  onWritingStart: () => void;
  onWritingComplete: (articles: WrittenArticle[], log: LogLine[]) => void;
  onBack: () => void;
}

export default function Step2Topics({
  siteConfig,
  existingTopics,
  existingArticles,
  existingLog,
  isWriting,
  onTopicsChange,
  onWritingStart,
  onWritingComplete,
  onBack,
}: Props) {
  const [topics, setTopics] = useState<TopicIdea[]>(existingTopics);
  const [isGenerating, setIsGenerating] = useState(false);
  const [topicsPerCategory, setTopicsPerCategory] = useState(5);
  const [error, setError] = useState("");
  const [log, setLog] = useState<LogLine[]>(existingLog);
  const [articleStatuses, setArticleStatuses] = useState<Record<string, "pending" | "writing" | "done" | "error">>({});
  const [writtenArticles, setWrittenArticles] = useState<WrittenArticle[]>(existingArticles);
  const logRef = useRef<HTMLDivElement>(null);

  const phase: "generate" | "select" | "writing" | "done" = isWriting
    ? "writing"
    : writtenArticles.length > 0
    ? "done"
    : topics.length > 0
    ? "select"
    : "generate";

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  const updateTopics = (updated: TopicIdea[]) => {
    setTopics(updated);
    onTopicsChange(updated);
  };

  const toggleTopic = (id: string) => {
    updateTopics(topics.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t)));
  };

  const selectAll = () => updateTopics(topics.map((t) => ({ ...t, selected: true })));
  const selectNone = () => updateTopics(topics.map((t) => ({ ...t, selected: false })));

  const generateTopics = async () => {
    setIsGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/generate-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteConfig, topicsPerCategory }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate topics");
      updateTopics(data.topics);
      setWrittenArticles([]);
      setLog([]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsGenerating(false);
    }
  };

  const writeArticles = async () => {
    const selected = topics.filter((t) => t.selected);
    if (selected.length === 0) return;

    onWritingStart();
    setLog([]);
    setWrittenArticles([]);
    setArticleStatuses({});

    const initialStatuses: Record<string, "pending"> = {};
    selected.forEach((t) => { initialStatuses[t.id] = "pending"; });
    setArticleStatuses(initialStatuses);

    const newLog: LogLine[] = [];
    const logAndStore = (message: string, type: LogLine["type"] = "info") => {
      const line: LogLine = { message, type, timestamp: new Date().toLocaleTimeString() };
      newLog.push(line);
      setLog([...newLog]);
    };

    logAndStore(`Starting parallel article writing for ${selected.length} topics...`, "info");

    try {
      const res = await fetch("/api/write-articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteConfig, topics: selected }),
      });

      if (!res.ok || !res.body) throw new Error("Failed to start article writing");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const finalArticles: WrittenArticle[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "log") {
              logAndStore(event.message, event.level || "info");
            } else if (event.type === "progress") {
              setArticleStatuses((prev) => ({ ...prev, [event.topicId]: event.status }));
              logAndStore(event.message, event.status === "error" ? "error" : event.status === "done" ? "success" : "info");
            } else if (event.type === "complete") {
              finalArticles.push(...(event.articles || []));
              logAndStore(event.message, "success");
            }
          } catch (_) {
            // skip malformed lines
          }
        }
      }

      setWrittenArticles(finalArticles);
      onWritingComplete(finalArticles, newLog);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      logAndStore(`Fatal error: ${msg}`, "error");
      onWritingComplete([], newLog);
    }
  };

  const selectedCount = topics.filter((t) => t.selected).length;

  const categorized = siteConfig.categories.map((cat) => ({
    ...cat,
    topics: topics.filter((t) => t.categorySlug === cat.slug),
  })).filter((c) => c.topics.length > 0);

  const logColor = (type: LogLine["type"]) => {
    if (type === "success") return "var(--success)";
    if (type === "error") return "var(--error)";
    if (type === "warning") return "#f59e0b";
    return "var(--text-secondary)";
  };

  const statusDot = (id: string) => {
    const s = articleStatuses[id];
    if (s === "done") return { bg: "var(--success)", label: "✓" };
    if (s === "error") return { bg: "var(--error)", label: "✗" };
    if (s === "writing") return { bg: "var(--accent)", label: "…" };
    return null;
  };

  return (
    <div>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontFamily: "var(--mono)", fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
          // TOPICS & ARTICLE WRITING
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Generate topic ideas, select the ones you want, then Claude writes all articles in parallel using your writing and SEO rules.
        </p>
      </div>

      {/* ── Phase: Generate topics ── */}
      {phase === "generate" && (
        <div className="card" style={{ marginBottom: "32px" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--text-tertiary)", letterSpacing: "0.1em", marginBottom: "20px" }}>
            // STEP 1: GENERATE TOPIC IDEAS
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
            <label style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
              TOPICS PER CATEGORY:
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              {[3, 5, 8, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setTopicsPerCategory(n)}
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "11px",
                    padding: "6px 14px",
                    border: `1px solid ${topicsPerCategory === n ? "var(--accent)" : "var(--border)"}`,
                    background: topicsPerCategory === n ? "rgba(255,0,102,0.1)" : "transparent",
                    color: topicsPerCategory === n ? "var(--accent)" : "var(--text-secondary)",
                    cursor: "pointer",
                    borderRadius: "3px",
                    transition: "all 0.15s",
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <button
              className="btn btn-primary"
              onClick={generateTopics}
              disabled={isGenerating}
              style={{ fontSize: "12px", padding: "14px 32px" }}
            >
              {isGenerating ? (
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ display: "inline-block", width: "12px", height: "12px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  GENERATING {topicsPerCategory * siteConfig.categories.length} TOPICS...
                </span>
              ) : (
                `GENERATE ${topicsPerCategory * siteConfig.categories.length} TOPIC IDEAS →`
              )}
            </button>
            {error && (
              <p style={{ color: "var(--error)", fontSize: "12px", fontFamily: "var(--mono)" }}>{error}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Topic grid ── */}
      {topics.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "var(--text-secondary)" }}>
              <span style={{ color: "var(--accent)" }}>{selectedCount}</span> of {topics.length} topics selected
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button className="btn btn-ghost" onClick={selectAll} disabled={isWriting} style={{ fontSize: "10px", padding: "6px 12px" }}>SELECT ALL</button>
              <button className="btn btn-ghost" onClick={selectNone} disabled={isWriting} style={{ fontSize: "10px", padding: "6px 12px" }}>DESELECT ALL</button>
              <button className="btn btn-secondary" onClick={generateTopics} disabled={isGenerating || isWriting} style={{ fontSize: "10px", padding: "6px 12px" }}>
                {isGenerating ? "REGENERATING..." : "REGENERATE"}
              </button>
            </div>
          </div>

          {categorized.map((cat) => (
            <div key={cat.slug} style={{ marginBottom: "28px" }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid var(--border)",
                paddingBottom: "10px",
                marginBottom: "14px",
              }}>
                <h2 style={{ fontFamily: "var(--mono)", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-primary)" }}>
                  // {cat.label}
                </h2>
                <span style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--text-tertiary)" }}>
                  {cat.topics.filter((t) => t.selected).length}/{cat.topics.length} selected
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "10px" }}>
                {cat.topics.map((topic) => {
                  const dot = statusDot(topic.id);
                  return (
                    <div
                      key={topic.id}
                      className={`topic-card ${topic.selected ? "selected" : ""}`}
                      onClick={() => !isWriting && toggleTopic(topic.id)}
                      style={{ cursor: isWriting ? "default" : "pointer", position: "relative" }}
                    >
                      {dot ? (
                        <div style={{
                          position: "absolute",
                          top: "10px",
                          right: "10px",
                          width: "18px",
                          height: "18px",
                          borderRadius: "50%",
                          background: dot.bg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "9px",
                          color: "#fff",
                          fontWeight: 700,
                        }}>
                          {dot.label}
                        </div>
                      ) : (
                        <div className="topic-card-check">{topic.selected ? "✓" : ""}</div>
                      )}
                      <div style={{ fontFamily: "var(--mono)", fontSize: "11px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px", paddingRight: "28px", lineHeight: 1.4 }}>
                        {topic.title}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px", lineHeight: 1.5 }}>
                        {topic.angle}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--text-tertiary)", letterSpacing: "0.06em" }}>TARGET:</span>
                        <span style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--accent)", letterSpacing: "0.04em" }}>{topic.targetKeyword}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Writing progress log ── */}
      {(isWriting || log.length > 0) && (
        <div className="card" style={{ marginBottom: "32px", background: "#050505" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--text-tertiary)", letterSpacing: "0.1em", marginBottom: "16px" }}>
            // WRITING PROGRESS
          </div>
          <div
            ref={logRef}
            style={{ maxHeight: "280px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px" }}
          >
            {log.map((line, i) => (
              <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--text-tertiary)", flexShrink: 0 }}>
                  {line.timestamp}
                </span>
                <span style={{ fontFamily: "var(--mono)", fontSize: "11px", color: logColor(line.type), lineHeight: 1.5 }}>
                  {line.message}
                </span>
              </div>
            ))}
            {isWriting && (
              <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "4px" }}>
                <span style={{ display: "inline-block", width: "10px", height: "10px", border: "2px solid rgba(255,0,102,0.3)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
                <span style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "var(--accent)" }}>Writing in progress...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Action buttons ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
        <button className="btn btn-secondary" onClick={onBack} disabled={isWriting} style={{ fontSize: "11px" }}>
          ← BACK
        </button>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {phase === "select" && selectedCount > 0 && (
            <button
              className="btn btn-primary"
              onClick={writeArticles}
              disabled={isWriting}
              style={{ fontSize: "12px", padding: "14px 32px" }}
            >
              WRITE {selectedCount} ARTICLE{selectedCount !== 1 ? "S" : ""} WITH CLAUDE →
            </button>
          )}

          {phase === "done" && writtenArticles.length > 0 && (
            <>
              <span style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "var(--success)" }}>
                ✓ {writtenArticles.filter((a) => a.status === "done").length}/{writtenArticles.length} articles written
              </span>
              <button
                className="btn btn-primary"
                onClick={() => onWritingComplete(writtenArticles, log)}
                style={{ fontSize: "12px", padding: "14px 32px" }}
              >
                REVIEW & EDIT ARTICLES →
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
