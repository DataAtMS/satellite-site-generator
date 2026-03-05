import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "wouter";

interface Site {
  id: number;
  siteName: string;
  domain: string;
  accentColor: string;
  netlifyUrl: string | null;
  githubOwner: string | null;
  githubRepo: string | null;
  status: string | null;
  tagline: string | null;
  heroSubtitle: string | null;
  partnerName: string | null;
  partnerUrl: string | null;
  twitterHandle: string | null;
  lastDeployedAt: string | null;
}

interface Article {
  id: number;
  siteId: number;
  slug: string;
  title: string;
  categorySlug: string;
  categoryLabel: string;
  targetKeyword: string | null;
  content: string;
  metaDescription: string | null;
  excerpt: string | null;
  altText: string | null;
  thumbnail: string | null;
  canonicalUrl: string | null;
  ogImageUrl: string | null;
  datePublished: string | null;
  dateModified: string | null;
}

interface Deploy {
  id: number;
  commitSha: string | null;
  message: string | null;
  status: string;
  triggeredAt: string;
  completedAt: string | null;
}

interface LogLine {
  message: string;
  type: "info" | "success" | "error" | "warning";
  timestamp: string;
}

type EditorTab = "articles" | "seo" | "deploys";

export default function SiteEditor() {
  const params = useParams<{ id: string }>();
  const siteId = parseInt(params.id ?? "0", 10);

  const [site, setSite] = useState<Site | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [deploys, setDeploys] = useState<Deploy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>("articles");
  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(null);
  const [editedArticle, setEditedArticle] = useState<Partial<Article>>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [redeploying, setRedeploying] = useState(false);
  const [redeployLog, setRedeployLog] = useState<LogLine[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!siteId) return;
    fetch(`/api/sites/${siteId}`)
      .then((r) => r.json())
      .then((data) => {
        setSite(data.site);
        setArticles(data.articles ?? []);
        setDeploys(data.deploys ?? []);
        if (data.articles?.length > 0) {
          setSelectedArticleId(data.articles[0].id);
          setEditedArticle(data.articles[0]);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [siteId]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [redeployLog]);

  const selectArticle = (article: Article) => {
    setSelectedArticleId(article.id);
    setEditedArticle(article);
    setSaveMsg(null);
  };

  const handleFieldChange = (field: keyof Article, value: string) => {
    setEditedArticle((prev) => ({ ...prev, [field]: value }));
  };

  const saveArticle = async () => {
    if (!selectedArticleId) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch(`/api/sites/${siteId}/articles/${selectedArticleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedArticle),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Save failed");
      }
      const data = await res.json();
      setArticles((prev) => prev.map((a) => (a.id === selectedArticleId ? data.article : a)));
      setEditedArticle(data.article);
      setSaveMsg("Saved successfully");
    } catch (err: unknown) {
      setSaveMsg(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const redeploy = async () => {
    if (!site?.githubOwner || !site?.githubRepo) return;
    setRedeploying(true);
    setRedeployLog([]);

    const addLog = (message: string, type: LogLine["type"] = "info") => {
      setRedeployLog((prev) => [...prev, { message, type, timestamp: new Date().toLocaleTimeString() }]);
    };

    try {
      const res = await fetch("/api/redeploy-to-github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Redeploy failed" }));
        throw new Error(err.error || "Redeploy failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const event = JSON.parse(trimmed);
            if (event.type === "log") {
              addLog(event.message, event.level || "info");
            } else if (event.type === "redeploy_complete") {
              addLog("Redeploy complete — Netlify is building the updated site.", "success");
              setSite((prev) => prev ? { ...prev, status: "deploying", lastDeployedAt: new Date().toISOString() } : prev);
              // Refresh deploys
              fetch(`/api/sites/${siteId}`)
                .then((r) => r.json())
                .then((data) => setDeploys(data.deploys ?? []));
            } else if (event.type === "error") {
              addLog(event.message, "error");
            }
          } catch {
            // skip
          }
        }
      }
    } catch (err: unknown) {
      addLog(`Error: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
    } finally {
      setRedeploying(false);
    }
  };

  const logTypeColor = (type: LogLine["type"]) => {
    if (type === "success") return "var(--success)";
    if (type === "error") return "var(--error)";
    if (type === "warning") return "#f59e0b";
    return "var(--text-secondary)";
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const metaDescLen = (editedArticle.metaDescription ?? "").length;

  if (loading) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "48px" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: "12px", color: "var(--text-tertiary)", letterSpacing: "0.08em" }}>
          LOADING SITE...
        </div>
      </div>
    );
  }

  if (error || !site) {
    return (
      <div className="card" style={{ border: "1px solid var(--error)", background: "rgba(255,50,50,0.04)", padding: "24px" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: "12px", color: "var(--error)", marginBottom: "8px" }}>✗ FAILED TO LOAD SITE</div>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{error || "Site not found"}</p>
        <Link href="/sites"><a className="btn btn-secondary" style={{ textDecoration: "none", fontSize: "11px", marginTop: "16px", display: "inline-block" }}>← BACK TO MY SITES</a></Link>
      </div>
    );
  }

  const selectedArticle = articles.find((a) => a.id === selectedArticleId);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "24px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <Link href="/sites">
              <a style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--text-tertiary)", textDecoration: "none", letterSpacing: "0.06em" }}>
                ← MY SITES
              </a>
            </Link>
            <span style={{ color: "var(--border)" }}>/</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--text-secondary)", letterSpacing: "0.06em" }}>
              {site.siteName}
            </span>
          </div>
          <h1 style={{ fontFamily: "var(--mono)", fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
            // {site.siteName}
          </h1>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--text-tertiary)" }}>{site.domain}</span>
            {site.netlifyUrl && (
              <a href={site.netlifyUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--accent)" }}>
                {site.netlifyUrl.replace("https://", "")} ↗
              </a>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          {site.netlifyUrl && (
            <a href={site.netlifyUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ textDecoration: "none", fontSize: "10px", padding: "10px 16px" }}>
              VIEW LIVE ↗
            </a>
          )}
          {site.githubOwner && site.githubRepo && (
            <button
              className="btn btn-primary"
              onClick={redeploy}
              disabled={redeploying}
              style={{ fontSize: "10px", padding: "10px 16px" }}
            >
              {redeploying ? (
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ display: "inline-block", width: "10px", height: "10px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  DEPLOYING...
                </span>
              ) : "⚡ REDEPLOY"}
            </button>
          )}
        </div>
      </div>

      {/* Redeploy log */}
      {redeployLog.length > 0 && (
        <div className="card" style={{ marginBottom: "24px" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--text-tertiary)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "10px" }}>
            // REDEPLOY LOG
          </div>
          <div
            ref={logRef}
            style={{ background: "#050505", border: "1px solid var(--border)", borderRadius: "3px", padding: "12px", maxHeight: "200px", overflowY: "auto", fontFamily: "var(--mono)", fontSize: "11px", lineHeight: 1.7 }}
          >
            {redeployLog.map((line, idx) => (
              <div key={idx} style={{ color: logTypeColor(line.type) }}>
                <span style={{ color: "var(--text-tertiary)", marginRight: "8px" }}>{line.timestamp}</span>
                {line.type === "success" ? "✓ " : line.type === "error" ? "✗ " : line.type === "warning" ? "⚠ " : "  "}
                {line.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0", borderBottom: "1px solid var(--border)", marginBottom: "24px" }}>
        {(["articles", "seo", "deploys"] as EditorTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              fontFamily: "var(--mono)",
              fontSize: "10px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "10px 20px",
              background: "none",
              border: "none",
              borderBottom: `2px solid ${activeTab === tab ? "var(--accent)" : "transparent"}`,
              color: activeTab === tab ? "var(--accent)" : "var(--text-tertiary)",
              cursor: "pointer",
              transition: "color 0.15s",
              marginBottom: "-1px",
            }}
          >
            {tab === "articles" ? `ARTICLES (${articles.length})` : tab === "deploys" ? `DEPLOY HISTORY (${deploys.length})` : "SEO"}
          </button>
        ))}
      </div>

      {/* Articles tab */}
      {activeTab === "articles" && (
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "20px", alignItems: "start" }}>
          {/* Article list */}
          <div className="card" style={{ padding: "0", overflow: "hidden" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--text-tertiary)", letterSpacing: "0.1em", textTransform: "uppercase", padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
              ARTICLES
            </div>
            {articles.map((article) => (
              <div
                key={article.id}
                onClick={() => selectArticle(article)}
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--border)",
                  cursor: "pointer",
                  background: selectedArticleId === article.id ? "rgba(255,0,102,0.06)" : "transparent",
                  borderLeft: `2px solid ${selectedArticleId === article.id ? "var(--accent)" : "transparent"}`,
                  transition: "background 0.1s",
                }}
              >
                <div style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--accent)", letterSpacing: "0.06em", marginBottom: "4px" }}>
                  {article.categoryLabel.toUpperCase()}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-primary)", lineHeight: 1.4, marginBottom: "4px" }}>
                  {article.title}
                </div>
                <div style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--text-tertiary)" }}>
                  /{article.slug}
                </div>
              </div>
            ))}
          </div>

          {/* Article editor */}
          {selectedArticle && (
            <div>
              <div className="card" style={{ marginBottom: "16px" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--text-tertiary)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>// EDIT ARTICLE</span>
                  {selectedArticle.dateModified && (
                    <span style={{ fontSize: "9px", color: "var(--text-tertiary)" }}>
                      Last modified: {selectedArticle.dateModified}
                    </span>
                  )}
                </div>

                {/* Title */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                    TITLE
                  </label>
                  <input
                    type="text"
                    value={editedArticle.title ?? ""}
                    onChange={(e) => handleFieldChange("title", e.target.value)}
                    style={{ width: "100%", background: "#0d0d0d", border: "1px solid var(--border)", borderRadius: "3px", padding: "10px 12px", fontFamily: "Georgia, serif", fontSize: "14px", color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                {/* Excerpt */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                    EXCERPT
                  </label>
                  <textarea
                    value={editedArticle.excerpt ?? ""}
                    onChange={(e) => handleFieldChange("excerpt", e.target.value)}
                    rows={2}
                    style={{ width: "100%", background: "#0d0d0d", border: "1px solid var(--border)", borderRadius: "3px", padding: "10px 12px", fontFamily: "Georgia, serif", fontSize: "13px", color: "var(--text-primary)", outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.6 }}
                  />
                </div>

                {/* Content */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                    CONTENT (MARKDOWN)
                  </label>
                  <textarea
                    value={editedArticle.content ?? ""}
                    onChange={(e) => handleFieldChange("content", e.target.value)}
                    rows={20}
                    style={{ width: "100%", background: "#050505", border: "1px solid var(--border)", borderRadius: "3px", padding: "12px", fontFamily: "var(--mono)", fontSize: "12px", color: "var(--text-secondary)", outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.7 }}
                  />
                </div>

                {/* Thumbnail */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                    THUMBNAIL URL
                  </label>
                  <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                    <input
                      type="text"
                      value={editedArticle.thumbnail ?? ""}
                      onChange={(e) => handleFieldChange("thumbnail", e.target.value)}
                      placeholder="https://..."
                      style={{ flex: 1, background: "#0d0d0d", border: "1px solid var(--border)", borderRadius: "3px", padding: "10px 12px", fontFamily: "var(--mono)", fontSize: "11px", color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }}
                    />
                    {editedArticle.thumbnail && (
                      <img
                        src={editedArticle.thumbnail}
                        alt="thumbnail preview"
                        style={{ width: "60px", height: "40px", objectFit: "cover", borderRadius: "2px", border: "1px solid var(--border)", flexShrink: 0 }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    )}
                  </div>
                </div>

                {/* Save button */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <button
                    className="btn btn-primary"
                    onClick={saveArticle}
                    disabled={saving}
                    style={{ fontSize: "11px" }}
                  >
                    {saving ? "SAVING..." : "SAVE CHANGES"}
                  </button>
                  {saveMsg && (
                    <span style={{ fontFamily: "var(--mono)", fontSize: "11px", color: saveMsg.startsWith("Error") ? "var(--error)" : "var(--success)" }}>
                      {saveMsg.startsWith("Error") ? "✗ " : "✓ "}{saveMsg}
                    </span>
                  )}
                  {site.githubOwner && site.githubRepo && (
                    <span style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--text-tertiary)" }}>
                      Save then hit ⚡ REDEPLOY to push changes live
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SEO tab */}
      {activeTab === "seo" && (
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "20px", alignItems: "start" }}>
          {/* Article list */}
          <div className="card" style={{ padding: "0", overflow: "hidden" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--text-tertiary)", letterSpacing: "0.1em", textTransform: "uppercase", padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
              ARTICLES
            </div>
            {articles.map((article) => (
              <div
                key={article.id}
                onClick={() => selectArticle(article)}
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--border)",
                  cursor: "pointer",
                  background: selectedArticleId === article.id ? "rgba(255,0,102,0.06)" : "transparent",
                  borderLeft: `2px solid ${selectedArticleId === article.id ? "var(--accent)" : "transparent"}`,
                  transition: "background 0.1s",
                }}
              >
                <div style={{ fontSize: "12px", color: "var(--text-primary)", lineHeight: 1.4, marginBottom: "4px" }}>
                  {article.title}
                </div>
                <div style={{ fontFamily: "var(--mono)", fontSize: "9px", color: (article.metaDescription?.length ?? 0) > 0 ? "var(--success)" : "var(--error)" }}>
                  {(article.metaDescription?.length ?? 0) > 0 ? `✓ ${article.metaDescription!.length} chars` : "✗ No meta description"}
                </div>
              </div>
            ))}
          </div>

          {/* SEO editor */}
          {selectedArticle && (
            <div className="card">
              <div style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--text-tertiary)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "20px", paddingBottom: "12px", borderBottom: "1px solid var(--border)" }}>
                // SEO FIELDS — {selectedArticle.title}
              </div>

              {/* Meta description */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase", display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span>META DESCRIPTION</span>
                  <span style={{ color: metaDescLen > 160 ? "var(--error)" : metaDescLen > 140 ? "#f59e0b" : metaDescLen > 0 ? "var(--success)" : "var(--text-tertiary)" }}>
                    {metaDescLen}/160
                  </span>
                </label>
                <textarea
                  value={editedArticle.metaDescription ?? ""}
                  onChange={(e) => handleFieldChange("metaDescription", e.target.value)}
                  rows={3}
                  placeholder="A concise description for search engines (120–160 characters)..."
                  style={{ width: "100%", background: "#0d0d0d", border: `1px solid ${metaDescLen > 160 ? "var(--error)" : "var(--border)"}`, borderRadius: "3px", padding: "10px 12px", fontFamily: "Georgia, serif", fontSize: "13px", color: "var(--text-primary)", outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.6 }}
                />
                {/* SERP preview */}
                <div style={{ marginTop: "10px", background: "#0a0a0a", border: "1px solid var(--border)", borderRadius: "3px", padding: "12px 14px" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--text-tertiary)", letterSpacing: "0.06em", marginBottom: "8px" }}>SERP PREVIEW</div>
                  <div style={{ fontSize: "16px", color: "#8ab4f8", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {editedArticle.title || selectedArticle.title}
                  </div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "#34a853", marginBottom: "4px" }}>
                    {site.domain}/articles/{selectedArticle.slug}
                  </div>
                  <div style={{ fontSize: "13px", color: "#bdc1c6", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {editedArticle.metaDescription || <span style={{ color: "var(--text-tertiary)" }}>No meta description set</span>}
                  </div>
                </div>
              </div>

              {/* Canonical URL */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                  CANONICAL URL
                </label>
                <input
                  type="text"
                  value={editedArticle.canonicalUrl ?? `https://${site.domain}/articles/${selectedArticle.slug}`}
                  onChange={(e) => handleFieldChange("canonicalUrl", e.target.value)}
                  style={{ width: "100%", background: "#0d0d0d", border: "1px solid var(--border)", borderRadius: "3px", padding: "10px 12px", fontFamily: "var(--mono)", fontSize: "11px", color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }}
                />
              </div>

              {/* OG Image */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                  OG IMAGE URL
                </label>
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <input
                    type="text"
                    value={editedArticle.ogImageUrl ?? editedArticle.thumbnail ?? ""}
                    onChange={(e) => handleFieldChange("ogImageUrl", e.target.value)}
                    placeholder="https://... (defaults to thumbnail if empty)"
                    style={{ flex: 1, background: "#0d0d0d", border: "1px solid var(--border)", borderRadius: "3px", padding: "10px 12px", fontFamily: "var(--mono)", fontSize: "11px", color: "var(--text-primary)", outline: "none", boxSizing: "border-box" }}
                  />
                  {(editedArticle.ogImageUrl || editedArticle.thumbnail) && (
                    <img
                      src={editedArticle.ogImageUrl || editedArticle.thumbnail || ""}
                      alt="OG preview"
                      style={{ width: "80px", height: "42px", objectFit: "cover", borderRadius: "2px", border: "1px solid var(--border)", flexShrink: 0 }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  )}
                </div>
              </div>

              {/* Target keyword */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                  TARGET KEYWORD (READ-ONLY)
                </label>
                <div style={{ fontFamily: "var(--mono)", fontSize: "12px", color: "var(--text-secondary)", background: "#0d0d0d", border: "1px solid var(--border)", borderRadius: "3px", padding: "10px 12px" }}>
                  {selectedArticle.targetKeyword || "—"}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button className="btn btn-primary" onClick={saveArticle} disabled={saving} style={{ fontSize: "11px" }}>
                  {saving ? "SAVING..." : "SAVE SEO FIELDS"}
                </button>
                {saveMsg && (
                  <span style={{ fontFamily: "var(--mono)", fontSize: "11px", color: saveMsg.startsWith("Error") ? "var(--error)" : "var(--success)" }}>
                    {saveMsg.startsWith("Error") ? "✗ " : "✓ "}{saveMsg}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Deploy history tab */}
      {activeTab === "deploys" && (
        <div>
          {deploys.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "48px" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "var(--text-tertiary)", letterSpacing: "0.08em" }}>
                NO DEPLOYS YET
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {deploys.map((deploy, idx) => (
                <div key={deploy.id} className="card" style={{ padding: "16px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--text-tertiary)" }}>#{deploys.length - idx}</span>
                      {deploy.commitSha && (
                        <code style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "var(--accent)", background: "#111", padding: "2px 6px", borderRadius: "2px" }}>
                          {deploy.commitSha.slice(0, 7)}
                        </code>
                      )}
                      <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                        {deploy.message || "Deployment"}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <span style={{ fontFamily: "var(--mono)", fontSize: "9px", color: deploy.status === "success" || deploy.status === "live" ? "var(--success)" : deploy.status === "failed" ? "var(--error)" : "#f59e0b", letterSpacing: "0.06em" }}>
                        ● {deploy.status.toUpperCase()}
                      </span>
                      <span style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--text-tertiary)" }}>
                        {formatDate(deploy.triggeredAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
