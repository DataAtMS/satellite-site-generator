import { useEffect, useState } from "react";
import { Link } from "wouter";

interface Site {
  id: number;
  siteName: string;
  domain: string;
  accentColor: string;
  netlifyUrl: string | null;
  githubOwner: string | null;
  githubRepo: string | null;
  status: string | null;
  createdAt: string;
  lastDeployedAt: string | null;
}

export default function MySites() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sites")
      .then((r) => r.json())
      .then((data) => {
        setSites(data.sites ?? []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const statusColor = (s: string | null) => {
    if (s === "live") return "var(--success)";
    if (s === "deploying" || s === "building") return "#f59e0b";
    if (s === "failed") return "var(--error)";
    return "var(--text-tertiary)";
  };

  return (
    <div>
      <div style={{ marginBottom: "32px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--mono)", fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
            // MY SITES
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
            All generated and deployed satellite sites. Click a site to edit content, update SEO, or redeploy.
          </p>
        </div>
        <Link href="/">
          <a
            className="btn btn-primary"
            style={{ textDecoration: "none", fontSize: "11px", padding: "12px 20px", whiteSpace: "nowrap" }}
          >
            + NEW SITE
          </a>
        </Link>
      </div>

      {loading && (
        <div className="card" style={{ textAlign: "center", padding: "48px" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: "12px", color: "var(--text-tertiary)", letterSpacing: "0.08em" }}>
            LOADING SITES...
          </div>
        </div>
      )}

      {error && (
        <div className="card" style={{ border: "1px solid var(--error)", background: "rgba(255,50,50,0.04)", padding: "24px" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: "12px", color: "var(--error)", marginBottom: "8px" }}>
            ✗ FAILED TO LOAD SITES
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{error}</p>
        </div>
      )}

      {!loading && !error && sites.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: "64px 32px" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "var(--text-tertiary)", letterSpacing: "0.1em", marginBottom: "16px" }}>
            NO SITES YET
          </div>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "24px", lineHeight: 1.6 }}>
            Generate your first satellite site to see it here. Sites deployed live will appear with their Netlify URL and deploy history.
          </p>
          <Link href="/">
            <a className="btn btn-primary" style={{ textDecoration: "none", fontSize: "12px" }}>
              GENERATE FIRST SITE →
            </a>
          </Link>
        </div>
      )}

      {!loading && !error && sites.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {sites.map((site) => (
            <div
              key={site.id}
              className="card"
              style={{
                borderLeft: `3px solid ${site.accentColor || "var(--accent)"}`,
                transition: "background 0.1s",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
                {/* Left: site info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "var(--mono)", fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>
                      {site.siteName}
                    </span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--text-tertiary)", border: "1px solid var(--border)", borderRadius: "2px", padding: "2px 6px", letterSpacing: "0.04em" }}>
                      {site.domain}
                    </span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: "9px", color: statusColor(site.status), letterSpacing: "0.06em" }}>
                      ● {(site.status ?? "pending").toUpperCase()}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                    {site.netlifyUrl && (
                      <div>
                        <div style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--text-tertiary)", letterSpacing: "0.06em", marginBottom: "2px" }}>NETLIFY</div>
                        <a
                          href={site.netlifyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "var(--accent)" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {site.netlifyUrl.replace("https://", "")}
                        </a>
                      </div>
                    )}
                    {site.githubOwner && site.githubRepo && (
                      <div>
                        <div style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--text-tertiary)", letterSpacing: "0.06em", marginBottom: "2px" }}>GITHUB</div>
                        <a
                          href={`https://github.com/${site.githubOwner}/${site.githubRepo}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "var(--accent)" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {site.githubOwner}/{site.githubRepo}
                        </a>
                      </div>
                    )}
                    <div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--text-tertiary)", letterSpacing: "0.06em", marginBottom: "2px" }}>CREATED</div>
                      <span style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "var(--text-secondary)" }}>
                        {formatDate(site.createdAt)}
                      </span>
                    </div>
                    {site.lastDeployedAt && (
                      <div>
                        <div style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--text-tertiary)", letterSpacing: "0.06em", marginBottom: "2px" }}>LAST DEPLOY</div>
                        <span style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "var(--text-secondary)" }}>
                          {formatDate(site.lastDeployedAt)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: actions */}
                <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                  {site.netlifyUrl && (
                    <a
                      href={site.netlifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ textDecoration: "none", fontSize: "10px", padding: "8px 14px" }}
                    >
                      VIEW LIVE ↗
                    </a>
                  )}
                  <Link href={`/sites/${site.id}`}>
                    <a className="btn btn-primary" style={{ textDecoration: "none", fontSize: "10px", padding: "8px 14px" }}>
                      EDIT SITE →
                    </a>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
