import { useState } from "react";
import type { SiteConfig, WrittenArticle } from "../lib/types";

interface Props {
  siteConfig: SiteConfig;
  articles: WrittenArticle[];
  onSubmit: (articles: WrittenArticle[]) => void;
  onBack: () => void;
}

export default function Step3Editor({ siteConfig, articles, onSubmit, onBack }: Props) {
  const [edited, setEdited] = useState<WrittenArticle[]>(articles);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"content" | "meta">("content");

  const updateArticle = (idx: number, updates: Partial<WrittenArticle>) => {
    setEdited((prev) => prev.map((a, i) => (i === idx ? { ...a, ...updates } : a)));
  };

  const activeArticle = activeIdx !== null ? edited[activeIdx] : null;

  const wordCount = (content: string) =>
    content.trim().split(/\s+/).filter(Boolean).length;

  const statusColor = (status: WrittenArticle["status"]) => {
    if (status === "done") return "var(--success)";
    if (status === "error") return "var(--error)";
    return "var(--text-tertiary)";
  };

  const doneCount = edited.filter((a) => a.status === "done").length;
  const errorCount = edited.filter((a) => a.status === "error").length;

  return (
    <div>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontFamily: "var(--mono)", fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
          // REVIEW & EDIT ARTICLES
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Review each article. Click any article to read and edit the content, title, meta description, and excerpt before generating the site.
        </p>
        <div style={{ display: "flex", gap: "16px", marginTop: "12px" }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "var(--success)" }}>
            ✓ {doneCount} written
          </span>
          {errorCount > 0 && (
            <span style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "var(--error)" }}>
              ✗ {errorCount} failed
            </span>
          )}
          <span style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "var(--text-tertiary)" }}>
            {edited.length} total articles
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: activeIdx !== null ? "320px 1fr" : "1fr", gap: "24px", alignItems: "start" }}>
        {/* ── Article list ── */}
        <div>
          {siteConfig.categories.map((cat) => {
            const catArticles = edited.filter((a) => a.categorySlug === cat.slug);
            if (catArticles.length === 0) return null;
            return (
              <div key={cat.slug} style={{ marginBottom: "24px" }}>
                <div style={{
                  fontFamily: "var(--mono)",
                  fontSize: "10px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--text-tertiary)",
                  borderBottom: "1px solid var(--border)",
                  paddingBottom: "8px",
                  marginBottom: "10px",
                }}>
                  // {cat.label}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {catArticles.map((article) => {
                    const globalIdx = edited.findIndex((a) => a.topicId === article.topicId);
                    const isActive = globalIdx === activeIdx;
                    const wc = wordCount(article.content);
                    return (
                      <div
                        key={article.topicId}
                        onClick={() => setActiveIdx(isActive ? null : globalIdx)}
                        style={{
                          padding: "12px 14px",
                          border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                          borderLeft: `3px solid ${isActive ? "var(--accent)" : statusColor(article.status)}`,
                          borderRadius: "3px",
                          cursor: "pointer",
                          background: isActive ? "rgba(255,0,102,0.04)" : "var(--bg-card)",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-focus)";
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
                        }}
                      >
                        <div style={{ fontFamily: "var(--mono)", fontSize: "11px", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.4, marginBottom: "4px" }}>
                          {article.title}
                        </div>
                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                          <span style={{ fontFamily: "var(--mono)", fontSize: "9px", color: statusColor(article.status) }}>
                            {article.status === "done" ? `✓ ${wc.toLocaleString()} words` : article.status === "error" ? "✗ failed" : "pending"}
                          </span>
                          <span style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--text-tertiary)" }}>
                            {article.targetKeyword}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Editor panel ── */}
        {activeArticle !== null && activeIdx !== null && (
          <div className="card" style={{ position: "sticky", top: "20px" }}>
            {/* Tab bar */}
            <div style={{ display: "flex", gap: "0", borderBottom: "1px solid var(--border)", marginBottom: "20px" }}>
              {(["content", "meta"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "10px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    padding: "10px 16px",
                    border: "none",
                    borderBottom: `2px solid ${activeTab === tab ? "var(--accent)" : "transparent"}`,
                    background: "transparent",
                    color: activeTab === tab ? "var(--accent)" : "var(--text-tertiary)",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {tab === "content" ? "ARTICLE CONTENT" : "SEO & META"}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <span style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--text-tertiary)", padding: "10px 0", alignSelf: "center" }}>
                {wordCount(activeArticle.content).toLocaleString()} words
              </span>
            </div>

            {activeTab === "content" && (
              <div>
                {/* Title */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--text-tertiary)", letterSpacing: "0.06em", display: "block", marginBottom: "6px" }}>
                    TITLE
                  </label>
                  <input
                    className="form-input"
                    value={activeArticle.title}
                    onChange={(e) => updateArticle(activeIdx, { title: e.target.value })}
                    style={{ width: "100%", fontWeight: 700 }}
                  />
                </div>

                {/* Content */}
                <div>
                  <label style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--text-tertiary)", letterSpacing: "0.06em", display: "block", marginBottom: "6px" }}>
                    ARTICLE CONTENT (MARKDOWN)
                  </label>
                  <textarea
                    className="form-input"
                    value={activeArticle.content}
                    onChange={(e) => updateArticle(activeIdx, { content: e.target.value })}
                    style={{
                      width: "100%",
                      minHeight: "480px",
                      fontFamily: "var(--mono)",
                      fontSize: "12px",
                      lineHeight: 1.6,
                      resize: "vertical",
                    }}
                  />
                </div>
              </div>
            )}

            {activeTab === "meta" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Slug */}
                <div>
                  <label style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--text-tertiary)", letterSpacing: "0.06em", display: "block", marginBottom: "6px" }}>
                    URL SLUG
                  </label>
                  <input
                    className="form-input"
                    value={activeArticle.slug}
                    onChange={(e) => updateArticle(activeIdx, { slug: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") })}
                    style={{ width: "100%", fontFamily: "var(--mono)", fontSize: "12px" }}
                  />
                  <div style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--text-tertiary)", marginTop: "4px" }}>
                    /articles/{activeArticle.slug}
                  </div>
                </div>

                {/* Meta description */}
                <div>
                  <label style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--text-tertiary)", letterSpacing: "0.06em", display: "block", marginBottom: "6px" }}>
                    META DESCRIPTION ({activeArticle.metaDescription.length}/160)
                  </label>
                  <textarea
                    className="form-input"
                    value={activeArticle.metaDescription}
                    onChange={(e) => updateArticle(activeIdx, { metaDescription: e.target.value })}
                    style={{ width: "100%", minHeight: "80px", fontSize: "13px", resize: "vertical" }}
                  />
                </div>

                {/* Excerpt */}
                <div>
                  <label style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--text-tertiary)", letterSpacing: "0.06em", display: "block", marginBottom: "6px" }}>
                    EXCERPT (listing pages)
                  </label>
                  <textarea
                    className="form-input"
                    value={activeArticle.excerpt}
                    onChange={(e) => updateArticle(activeIdx, { excerpt: e.target.value })}
                    style={{ width: "100%", minHeight: "70px", fontSize: "13px", resize: "vertical" }}
                  />
                </div>

                {/* Alt text */}
                <div>
                  <label style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--text-tertiary)", letterSpacing: "0.06em", display: "block", marginBottom: "6px" }}>
                    THUMBNAIL ALT TEXT
                  </label>
                  <input
                    className="form-input"
                    value={activeArticle.altText}
                    onChange={(e) => updateArticle(activeIdx, { altText: e.target.value })}
                    style={{ width: "100%", fontSize: "13px" }}
                  />
                </div>

                {/* Dates */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--text-tertiary)", letterSpacing: "0.06em", display: "block", marginBottom: "6px" }}>
                      DATE PUBLISHED
                    </label>
                    <input
                      className="form-input"
                      type="date"
                      value={activeArticle.datePublished}
                      onChange={(e) => updateArticle(activeIdx, { datePublished: e.target.value })}
                      style={{ width: "100%", fontFamily: "var(--mono)", fontSize: "12px" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--text-tertiary)", letterSpacing: "0.06em", display: "block", marginBottom: "6px" }}>
                      DATE MODIFIED
                    </label>
                    <input
                      className="form-input"
                      type="date"
                      value={activeArticle.dateModified}
                      onChange={(e) => updateArticle(activeIdx, { dateModified: e.target.value })}
                      style={{ width: "100%", fontFamily: "var(--mono)", fontSize: "12px" }}
                    />
                  </div>
                </div>

                {/* Target keyword */}
                <div>
                  <label style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--text-tertiary)", letterSpacing: "0.06em", display: "block", marginBottom: "6px" }}>
                    TARGET KEYWORD
                  </label>
                  <input
                    className="form-input"
                    value={activeArticle.targetKeyword}
                    onChange={(e) => updateArticle(activeIdx, { targetKeyword: e.target.value })}
                    style={{ width: "100%", fontFamily: "var(--mono)", fontSize: "12px" }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "40px" }}>
        <button className="btn btn-secondary" onClick={onBack} style={{ fontSize: "11px" }}>
          ← BACK
        </button>
        <button
          className="btn btn-primary"
          onClick={() => onSubmit(edited)}
          style={{ fontSize: "12px", padding: "14px 32px" }}
        >
          GENERATE SITE WITH {doneCount} ARTICLE{doneCount !== 1 ? "S" : ""} →
        </button>
      </div>
    </div>
  );
}
