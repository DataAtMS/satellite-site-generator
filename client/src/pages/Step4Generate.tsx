import { useEffect, useRef, useState } from "react";
import type { SiteConfig, WrittenArticle, LogLine } from "../lib/types";

interface DeployResult {
  siteId: number;
  deployId?: number;
  githubUrl: string;
  netlifyUrl: string;
  owner: string;
  repo: string;
  commitSha: string;
  status: "ready" | "deploying" | "failed";
}

interface Props {
  siteConfig: SiteConfig;
  articles: WrittenArticle[];
  log: LogLine[];
  downloadUrl: string | null;
  isGenerating: boolean;
  onStart: () => void;
  onLogLine: (line: LogLine) => void;
  onComplete: (url: string) => void;
  onReset: () => void;
  onBack: () => void;
}

export default function Step4Generate({
  siteConfig,
  articles,
  log,
  downloadUrl,
  isGenerating,
  onStart,
  onLogLine,
  onComplete,
  onReset,
  onBack,
}: Props) {
  const logRef = useRef<HTMLDivElement>(null);
  const [skipImages, setSkipImages] = useState(false);
  const [deployMode, setDeployMode] = useState<"zip" | "live">("live");
  const [imageProgress, setImageProgress] = useState<Record<string, "pending" | "generating" | "done" | "error">>({});
  const [deployResult, setDeployResult] = useState<DeployResult | null>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  const addLog = (message: string, type: LogLine["type"] = "info") => {
    onLogLine({ message, type, timestamp: new Date().toLocaleTimeString() });
  };

  const generateImages = async (articlesToProcess: WrittenArticle[]): Promise<WrittenArticle[]> => {
    const doneArticles = articlesToProcess.filter((a) => a.status === "done");
    if (doneArticles.length === 0) return articlesToProcess;

    addLog(`Generating ${doneArticles.length} article thumbnails...`, "info");
    addLog("This takes 5–15 seconds per image. You can skip this step if preferred.", "warning");

    const initialProgress: Record<string, "pending" | "generating" | "done" | "error"> = {};
    doneArticles.forEach((a) => { initialProgress[a.topicId] = "pending"; });
    setImageProgress(initialProgress);

    const payload = doneArticles.map((a) => ({
      topicId: a.topicId,
      title: a.title,
      altText: a.altText,
      categoryLabel: a.categoryLabel,
    }));

    const res = await fetch("/api/generate-images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articles: payload }),
    });

    if (!res.ok || !res.body) {
      addLog("Image generation API unavailable — proceeding without thumbnails.", "warning");
      return articlesToProcess;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const thumbnailMap: Record<string, string> = {};

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        try {
          const event = JSON.parse(trimmed.slice(6));
          if (event.type === "progress") {
            setImageProgress((prev) => ({ ...prev, [event.topicId]: event.status }));
            if (event.status === "done" && event.url) {
              thumbnailMap[event.topicId] = event.url;
              addLog(`Image ready: "${doneArticles.find((a) => a.topicId === event.topicId)?.title || event.topicId}"`, "success");
            } else if (event.status === "error") {
              addLog(`Image failed: ${event.message}`, "warning");
            } else if (event.status === "generating") {
              addLog(event.message, "info");
            }
          } else if (event.type === "complete") {
            addLog(`Images: ${event.successCount}/${doneArticles.length} generated successfully.`, event.successCount > 0 ? "success" : "warning");
          }
        } catch {
          // skip unparseable lines
        }
      }
    }

    return articlesToProcess.map((a) => ({
      ...a,
      thumbnail: thumbnailMap[a.topicId] || a.thumbnail || "",
    }));
  };

  /** Stream NDJSON from a fetch response, calling onEvent for each parsed line */
  const streamNdjson = async (
    res: Response,
    onEvent: (event: Record<string, unknown>) => void
  ) => {
    if (!res.body) throw new Error("No response body");
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
          onEvent(JSON.parse(trimmed));
        } catch {
          // skip
        }
      }
    }
  };

  const startGeneration = async () => {
    onStart();
    setDeployResult(null);

    try {
      addLog(`Building ${siteConfig.siteName} (${siteConfig.domain})...`, "info");
      addLog(`${articles.length} articles · ${siteConfig.categories.length} categories`, "info");

      // Step 1: Generate images (unless skipped)
      let articlesWithImages = articles;
      if (!skipImages) {
        try {
          articlesWithImages = await generateImages(articles);
        } catch (imgErr: unknown) {
          addLog(`Image generation failed: ${imgErr instanceof Error ? imgErr.message : "Unknown error"}. Continuing without images.`, "warning");
        }
      } else {
        addLog("Image generation skipped — articles will use placeholder images.", "warning");
      }

      if (deployMode === "live") {
        // ── LIVE DEPLOY MODE ────────────────────────────────────────────────
        addLog("Pushing to GitHub...", "info");

        const githubRes = await fetch("/api/deploy-to-github", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ siteConfig, articles: articlesWithImages }),
        });

        if (!githubRes.ok || !githubRes.body) {
          const err = await githubRes.json().catch(() => ({ error: "GitHub deploy failed" }));
          throw new Error(err.error || "GitHub deploy failed");
        }

        type GithubCompleteEvent = { type: string; siteId: number; owner: string; repo: string; commitSha: string; githubUrl: string; };
        let githubResult: GithubCompleteEvent | null = null;

        await streamNdjson(githubRes, (event) => {
          if (event.type === "log") {
            addLog(event.message as string, (event.level as LogLine["type"]) || "info");
          } else if (event.type === "github_complete") {
            githubResult = event as unknown as GithubCompleteEvent;
            addLog(`GitHub repo ready: ${(event as unknown as GithubCompleteEvent).githubUrl}`, "success");
          } else if (event.type === "error") {
            throw new Error(event.message as string || "GitHub deploy error");
          }
        });

        if (!githubResult) throw new Error("GitHub deploy did not complete");

        const siteId = (githubResult as GithubCompleteEvent).siteId;
        const owner = (githubResult as GithubCompleteEvent).owner;
        const repo = (githubResult as GithubCompleteEvent).repo;
        const commitSha = (githubResult as GithubCompleteEvent).commitSha;
        const githubUrl = (githubResult as GithubCompleteEvent).githubUrl;

        // Step 2: Link to Netlify
        addLog("Linking to Netlify and triggering first deploy...", "info");
        addLog("Netlify will build the site automatically (~60 seconds)...", "info");

        const netlifyRes = await fetch("/api/deploy-to-netlify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ siteId, owner, repo }),
        });

        if (!netlifyRes.ok || !netlifyRes.body) {
          const err = await netlifyRes.json().catch(() => ({ error: "Netlify deploy failed" }));
          throw new Error(err.error || "Netlify deploy failed");
        }

        type NetlifyCompleteEvent = { type: string; siteId: number; netlifySiteId: string; netlifyUrl: string; status: string; };
        let netlifyResult: NetlifyCompleteEvent | null = null;

        await streamNdjson(netlifyRes, (event) => {
          if (event.type === "log") {
            addLog(event.message as string, (event.level as LogLine["type"]) || "info");
          } else if (event.type === "netlify_complete") {
            netlifyResult = event as unknown as NetlifyCompleteEvent;
          } else if (event.type === "error") {
            throw new Error(event.message as string || "Netlify deploy error");
          }
        });

        const _netlifyResult = netlifyResult as NetlifyCompleteEvent | null;
        const netlifyUrl = _netlifyResult?.netlifyUrl || `https://${repo}.netlify.app`;
        const deployStatus = _netlifyResult?.status || "deploying";

        setDeployResult({
          siteId,
          githubUrl,
          netlifyUrl,
          owner,
          repo,
          commitSha,
          status: deployStatus === "ready" ? "ready" : "deploying",
        });

        if (deployStatus === "ready") {
          addLog(`Site is live at: ${netlifyUrl}`, "success");
        } else {
          addLog(`Site linked at ${netlifyUrl} — Netlify may still be building (check in ~60s).`, "warning");
        }

        onComplete(netlifyUrl);
      } else {
        // ── ZIP DOWNLOAD MODE ───────────────────────────────────────────────
        addLog("Assembling site ZIP...", "info");
        const res = await fetch("/api/generate-site", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ siteConfig, articles: articlesWithImages }),
        });

        if (!res.ok || !res.body) {
          const err = await res.json().catch(() => ({ error: "Generation failed" }));
          throw new Error(err.error || "Generation failed");
        }

        await streamNdjson(res, (event) => {
          if (event.type === "log") {
            addLog(event.message as string, (event.level as LogLine["type"]) || "info");
          } else if (event.type === "complete") {
            const dataUrl: string = event.downloadUrl as string;
            const base64 = dataUrl.split(",")[1];
            const byteChars = atob(base64);
            const byteNums = new Uint8Array(byteChars.length);
            for (let i = 0; i < byteChars.length; i++) {
              byteNums[i] = byteChars.charCodeAt(i);
            }
            const blob = new Blob([byteNums], { type: "application/zip" });
            const blobUrl = URL.createObjectURL(blob);
            addLog(`ZIP ready — ${(blob.size / 1024).toFixed(0)} KB`, "success");
            addLog("Site generation complete!", "success");
            onComplete(blobUrl);
          } else if (event.type === "error") {
            throw new Error(event.message as string || "Generation error");
          }
        });
      }
    } catch (e: unknown) {
      onLogLine({
        message: `Error: ${e instanceof Error ? e.message : "Unknown error"}`,
        type: "error",
        timestamp: new Date().toLocaleTimeString(),
      });
    }
  };

  const logTypeColor = (type: LogLine["type"]) => {
    if (type === "success") return "var(--success)";
    if (type === "error") return "var(--error)";
    if (type === "warning") return "#f59e0b";
    return "var(--text-secondary)";
  };

  const doneArticles = articles.filter((a) => a.status === "done").length;
  const imageProgressValues = Object.values(imageProgress);
  const imagesTotal = imageProgressValues.length;
  const imagesDone = imageProgressValues.filter((s) => s === "done").length;
  const imagesGenerating = imageProgressValues.some((s) => s === "generating");

  return (
    <div>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontFamily: "var(--mono)", fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
          // GENERATE SITE
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Choose how to deliver your site: deploy it live to Netlify (recommended) or download a ZIP to self-host.
        </p>
      </div>

      {/* Deploy mode toggle */}
      {!isGenerating && !downloadUrl && !deployResult && (
        <div className="card" style={{ marginBottom: "24px" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--text-tertiary)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid var(--border)" }}>
            // DELIVERY METHOD
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {(["live", "zip"] as const).map((mode) => (
              <div
                key={mode}
                onClick={() => setDeployMode(mode)}
                style={{
                  border: `1px solid ${deployMode === mode ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: "4px",
                  padding: "16px",
                  cursor: "pointer",
                  background: deployMode === mode ? "rgba(255,0,102,0.04)" : "transparent",
                  transition: "border-color 0.15s, background 0.15s",
                }}
              >
                <div style={{ fontFamily: "var(--mono)", fontSize: "11px", fontWeight: 700, color: deployMode === mode ? "var(--accent)" : "var(--text-primary)", marginBottom: "6px", letterSpacing: "0.06em" }}>
                  {mode === "live" ? "⚡ DEPLOY LIVE" : "⬇ DOWNLOAD ZIP"}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {mode === "live"
                    ? "Push to GitHub + deploy to Netlify automatically. Site is live in ~2 minutes. Editable later from My Sites."
                    : "Download a ZIP file to self-host on any platform (Vercel, Netlify, Manus, etc)."}
                </div>
                {mode === "live" && (
                  <div style={{ marginTop: "8px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {["GitHub repo", "Netlify deploy", "Auto-redeploy on edit", "Deploy history"].map((tag) => (
                      <span key={tag} style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--text-tertiary)", border: "1px solid var(--border)", borderRadius: "2px", padding: "2px 6px", letterSpacing: "0.04em" }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--text-tertiary)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid var(--border)" }}>
          // GENERATION SUMMARY
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px" }}>
          {[
            { label: "Site Name", value: siteConfig.siteName },
            { label: "Domain", value: siteConfig.domain },
            { label: "Categories", value: String(siteConfig.categories.length) },
            { label: "Articles", value: `${doneArticles} of ${articles.length}` },
            { label: "Accent Color", value: siteConfig.accentColor },
            { label: "Partner", value: siteConfig.partnerName },
          ].map((item) => (
            <div key={item.label}>
              <div style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "4px" }}>
                {item.label}
              </div>
              <div style={{ fontFamily: "var(--mono)", fontSize: "12px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                {item.label === "Accent Color" && (
                  <span style={{ display: "inline-block", width: "12px", height: "12px", borderRadius: "2px", background: item.value, flexShrink: 0 }} />
                )}
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Image generation option */}
      {!isGenerating && !downloadUrl && !deployResult && (
        <div className="card" style={{ marginBottom: "24px" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--text-tertiary)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid var(--border)" }}>
            // IMAGE GENERATION
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "12px" }}>
                By default, the generator creates a unique AI-generated thumbnail for each article using the article's alt text as the image prompt. This adds <strong style={{ color: "var(--text-primary)" }}>~5–15 seconds per article</strong> to the generation time.
              </p>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "13px", color: "var(--text-secondary)" }}>
                <input
                  type="checkbox"
                  checked={skipImages}
                  onChange={(e) => setSkipImages(e.target.checked)}
                  style={{ width: "14px", height: "14px", accentColor: "var(--accent)", cursor: "pointer" }}
                />
                Skip image generation (use placeholder images instead)
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Image progress (shown during generation) */}
      {imagesTotal > 0 && (
        <div className="card" style={{ marginBottom: "24px" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--text-tertiary)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>// IMAGE GENERATION</span>
            <span style={{ color: imagesGenerating ? "var(--accent)" : "var(--success)" }}>
              {imagesDone} / {imagesTotal}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "6px" }}>
            {articles.filter((a) => a.status === "done").map((a) => {
              const status = imageProgress[a.topicId] || "pending";
              const statusColor = status === "done" ? "var(--success)" : status === "error" ? "var(--error)" : status === "generating" ? "var(--accent)" : "var(--text-tertiary)";
              const statusIcon = status === "done" ? "✓" : status === "error" ? "✗" : status === "generating" ? "◌" : "○";
              return (
                <div key={a.topicId} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "var(--text-secondary)" }}>
                  <span style={{ color: statusColor, fontFamily: "var(--mono)", flexShrink: 0 }}>{statusIcon}</span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* What gets generated */}
      {!isGenerating && !downloadUrl && !deployResult && (
        <div className="card" style={{ marginBottom: "24px" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--text-tertiary)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid var(--border)" }}>
            // WHAT GETS GENERATED
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {[
              "React + Vite + TypeScript project",
              "Dark terminal theme (Space Mono + Georgia)",
              "Homepage with hero, featured article, topic sections",
              "Editorial body copy + About section",
              `${siteConfig.categories.length} category pages with SEO`,
              `${doneArticles} article pages with full SEO`,
              "Reading progress bar + article counter",
              "TOC sidebar on desktop",
              "FURTHER READING cross-category section",
              "XML sitemap + robots.txt",
              "JSON-LD schemas (Article, BreadcrumbList)",
              "OG + Twitter Card meta tags",
              "Netlify _redirects + vercel.json",
              "README.md with deploy instructions",
            ].map((item) => (
              <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "13px", color: "var(--text-secondary)" }}>
                <span style={{ color: "var(--success)", flexShrink: 0, marginTop: "1px" }}>✓</span>
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generation log */}
      {(isGenerating || log.length > 0) && (
        <div className="card" style={{ marginBottom: "24px" }}>
          <div style={{
            fontFamily: "var(--mono)", fontSize: "10px", color: "var(--text-tertiary)", letterSpacing: "0.1em",
            textTransform: "uppercase", marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span>// GENERATION LOG</span>
            {isGenerating && (
              <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--accent)" }}>
                <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "var(--accent)", animation: "pulse 1s infinite" }} />
                RUNNING
              </span>
            )}
          </div>
          <div
            ref={logRef}
            style={{
              background: "#050505",
              border: "1px solid var(--border)",
              borderRadius: "3px",
              padding: "16px",
              maxHeight: "320px",
              overflowY: "auto",
              fontFamily: "var(--mono)",
              fontSize: "11px",
              lineHeight: 1.7,
            }}
          >
            {log.map((line, idx) => (
              <div key={idx} style={{ color: logTypeColor(line.type) }}>
                <span style={{ color: "var(--text-tertiary)", marginRight: "8px" }}>{line.timestamp}</span>
                {line.type === "success" ? "✓ " : line.type === "error" ? "✗ " : line.type === "warning" ? "⚠ " : "  "}
                {line.message}
              </div>
            ))}
            {isGenerating && (
              <div style={{ color: "var(--accent)" }}>
                <span style={{ color: "var(--text-tertiary)", marginRight: "8px" }}>{new Date().toLocaleTimeString()}</span>
                ▊
              </div>
            )}
          </div>
        </div>
      )}

      {/* Live deploy success */}
      {deployResult && (
        <div className="card" style={{ marginBottom: "24px", border: `1px solid ${deployResult.status === "ready" ? "var(--success)" : "#f59e0b"}`, background: deployResult.status === "ready" ? "rgba(0,200,100,0.04)" : "rgba(245,158,11,0.04)" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: "12px", color: deployResult.status === "ready" ? "var(--success)" : "#f59e0b", letterSpacing: "0.06em", marginBottom: "16px" }}>
            {deployResult.status === "ready" ? "✓ SITE IS LIVE" : "⚡ DEPLOYING — WILL BE LIVE SHORTLY"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
            <div>
              <div style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "6px" }}>NETLIFY URL</div>
              <a href={deployResult.netlifyUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "var(--mono)", fontSize: "12px", color: "var(--accent)", wordBreak: "break-all" }}>
                {deployResult.netlifyUrl}
              </a>
            </div>
            <div>
              <div style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "6px" }}>GITHUB REPO</div>
              <a href={deployResult.githubUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "var(--mono)", fontSize: "12px", color: "var(--accent)", wordBreak: "break-all" }}>
                {deployResult.githubUrl}
              </a>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <a
              href={deployResult.netlifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ textDecoration: "none", fontSize: "12px", padding: "12px 24px" }}
            >
              VIEW LIVE SITE →
            </a>
            <a
              href="/sites"
              className="btn btn-secondary"
              style={{ textDecoration: "none", fontSize: "11px" }}
            >
              MY SITES DASHBOARD
            </a>
            <button className="btn btn-secondary" onClick={onReset} style={{ fontSize: "11px" }}>
              NEW SITE
            </button>
          </div>
        </div>
      )}

      {/* ZIP download success */}
      {downloadUrl && !deployResult && (
        <div className="card" style={{ marginBottom: "24px", border: "1px solid var(--success)", background: "rgba(0,200,100,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <div style={{ fontFamily: "var(--mono)", fontSize: "12px", color: "var(--success)", letterSpacing: "0.06em", marginBottom: "6px" }}>
                ✓ SITE GENERATED SUCCESSFULLY
              </div>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                Your project ZIP is ready. Extract it, run{" "}
                <code style={{ fontFamily: "var(--mono)", background: "#111", padding: "1px 5px", borderRadius: "2px" }}>pnpm install</code>
                {" "}then{" "}
                <code style={{ fontFamily: "var(--mono)", background: "#111", padding: "1px 5px", borderRadius: "2px" }}>pnpm dev</code>
                {" "}to preview locally, or deploy to Vercel/Netlify/Manus.
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <a
                href={downloadUrl}
                download={`${siteConfig.domain.replace(/[^a-z0-9]/gi, "-")}-site.zip`}
                className="btn btn-primary"
                style={{ textDecoration: "none", fontSize: "12px", padding: "12px 24px" }}
              >
                DOWNLOAD ZIP →
              </a>
              <button className="btn btn-secondary" onClick={onReset} style={{ fontSize: "11px" }}>
                NEW SITE
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "16px" }}>
        <button className="btn btn-secondary" onClick={onBack} disabled={isGenerating} style={{ fontSize: "11px" }}>
          ← BACK
        </button>
        {!downloadUrl && !deployResult && (
          <button
            className="btn btn-primary"
            onClick={startGeneration}
            disabled={isGenerating}
            style={{ fontSize: "12px", padding: "14px 32px" }}
          >
            {isGenerating ? (
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ display: "inline-block", width: "12px", height: "12px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                {deployMode === "live" ? "DEPLOYING..." : "GENERATING..."}
              </span>
            ) : deployMode === "live" ? (
              `DEPLOY LIVE ${skipImages ? "(no images)" : "WITH IMAGES"} →`
            ) : (
              `GENERATE ZIP ${skipImages ? "(no images)" : "WITH IMAGES"} →`
            )}
          </button>
        )}
      </div>
    </div>
  );
}
