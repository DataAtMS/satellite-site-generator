// Design: Minimal Dark Terminal — DTC101 Clone
// Homepage UX v2: Featured article + topic-section layout
// Contrast: all secondary text minimum #777, links #cc4466, footer with category links

import { Link } from "wouter";
import { articles, CATEGORIES } from "@/data/articles";
import { useState, useEffect } from "react";
import { ArrowRight, Menu, X, BookOpen } from "lucide-react";

export default function Home() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    document.title = "Ecommerce Heatmaps: See What Visitors Do";

    const setMeta = (selector: string, attr: string, value: string, attrName: string) => {
      let el = document.querySelector(selector) as HTMLElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attr);
        document.head.appendChild(el);
      }
      el.setAttribute('content', value);
    };

    const desc = 'Ecommerce heatmaps explained. Practical guides on scroll maps, click maps, move maps, and mobile heatmaps to improve your store\'s conversion rate.';
    const ogImg = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663404057351/dp2m2KZzpEAJHK3xhXkoSn/thumb-scroll-maps-aKxzx3iNqL4oz5GZCqDCWQ.webp';

    setMeta('meta[name="description"]', 'description', desc, 'name');
    setMeta('meta[property="og:title"]', 'og:title', 'Ecommerce Heatmaps: See What Visitors Do', 'property');
    setMeta('meta[property="og:description"]', 'og:description', desc, 'property');
    setMeta('meta[property="og:image"]', 'og:image', ogImg, 'property');
    setMeta('meta[property="og:url"]', 'og:url', 'https://ecommerceheatmaps.com/', 'property');
    setMeta('meta[property="og:type"]', 'og:type', 'website', 'property');
    setMeta('meta[property="og:site_name"]', 'og:site_name', 'Ecommerce Heatmaps', 'property');
    setMeta('meta[name="twitter:card"]', 'twitter:card', 'summary_large_image', 'name');
    setMeta('meta[name="twitter:title"]', 'twitter:title', 'Ecommerce Heatmaps: See What Visitors Do', 'name');
    setMeta('meta[name="twitter:description"]', 'twitter:description', desc, 'name');
    setMeta('meta[name="twitter:image"]', 'twitter:image', ogImg, 'name');
    setMeta('meta[name="twitter:site"]', 'twitter:site', '@ecomheatmaps', 'name');

    const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (canonical) {
      canonical.setAttribute('href', 'https://ecommerceheatmaps.com/');
    }
  }, []);

  const featured = articles[0];

  const topicSections = CATEGORIES.filter((c) => c.slug !== "all").map((cat) => ({
    ...cat,
    items: articles.filter((a) => a.categorySlug === cat.slug),
  })).filter((s) => s.items.length > 0);

  // Shared text color constants for consistent contrast
  const COLOR = {
    primary: "#f0f0f0",      // headings, titles
    body: "#c8c8c8",         // body text — readable on #0a0a0a
    secondary: "#999",       // excerpts, descriptions
    tertiary: "#777",        // metadata, counts, labels — minimum contrast
    faint: "#555",           // dividers, very secondary
    accent: "#ff0066",       // brand accent — CTAs, logo, category labels
    link: "#cc4466",         // inline links — muted rose
    bg: "#0a0a0a",
    bgCard: "#0d0d0d",
    border: "#1a1a1a",
  };

  return (
    <div style={{ minHeight: "100vh", background: COLOR.bg, color: COLOR.body }}>
      {/* ── Top nav bar ── */}
      <header
        style={{
          borderBottom: `1px solid ${COLOR.border}`,
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: COLOR.bg,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 24px",
          }}
        >
          <Link href="/">
            <span
              style={{
                fontFamily: "'Space Mono', monospace",
                fontWeight: 700,
                fontSize: "13px",
                color: COLOR.accent,
                letterSpacing: "0.05em",
                cursor: "pointer",
              }}
            >
              ECOMMERCE HEATMAPS
            </span>
          </Link>

          <nav className="hidden-mobile" style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            {topicSections.map((sec) => (
              <Link key={sec.slug} href={`/${sec.slug}`}>
                <span
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "10px",
                    color: COLOR.tertiary,
                    letterSpacing: "0.06em",
                    textDecoration: "none",
                    cursor: "pointer",
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = COLOR.accent)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = COLOR.tertiary)}
                >
                  {sec.label.toUpperCase()}
                </span>
              </Link>
            ))}
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: COLOR.faint }}>
              {articles.length} ARTICLES
            </span>
          </nav>

          <button
            className="mobile-only"
            onClick={() => setMobileNavOpen((v) => !v)}
            style={{
              background: "none",
              border: "none",
              color: COLOR.secondary,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontFamily: "'Space Mono', monospace",
              fontSize: "10px",
            }}
          >
            {mobileNavOpen ? <X size={16} /> : <Menu size={16} />}
            <span>{mobileNavOpen ? "CLOSE" : "TOPICS"}</span>
          </button>
        </div>

        {mobileNavOpen && (
          <div
            className="mobile-only"
            style={{
              borderTop: `1px solid ${COLOR.border}`,
              background: COLOR.bg,
              padding: "8px 0",
              flexDirection: "column",
            }}
          >
            {topicSections.map((sec) => (
              <Link key={sec.slug} href={`/${sec.slug}`}>
                <div
                  onClick={() => setMobileNavOpen(false)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 24px",
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "11px",
                    letterSpacing: "0.08em",
                    color: COLOR.secondary,
                    textDecoration: "none",
                    borderLeft: "2px solid transparent",
                    cursor: "pointer",
                    transition: "background 0.1s, border-color 0.1s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = "#0f0f0f";
                    (e.currentTarget as HTMLDivElement).style.borderLeftColor = COLOR.accent;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = "transparent";
                    (e.currentTarget as HTMLDivElement).style.borderLeftColor = "transparent";
                  }}
                >
                  <span>{sec.label.toUpperCase()}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ color: COLOR.tertiary, fontSize: "10px" }}>{sec.items.length}</span>
                    <span style={{ color: COLOR.faint, fontSize: "10px" }}>→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* ── Hero / H1 section ── */}
      <section
        style={{
          width: "100%",
          background: COLOR.bg,
          borderBottom: `1px solid ${COLOR.border}`,
        }}
      >
        <div
          style={{
            maxWidth: "860px",
            margin: "0 auto",
            padding: "clamp(40px, 8vw, 72px) clamp(24px, 6vw, 64px) clamp(40px, 6vw, 64px)",
          }}
        >
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "10px",
                color: COLOR.accent,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: "20px",
              }}
            >
              » BEHAVIORAL ANALYTICS FOR ECOMMERCE
            </div>

            <h1
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
                fontWeight: 700,
                color: COLOR.primary,
                lineHeight: 1.2,
                marginBottom: "16px",
                letterSpacing: "-0.02em",
              }}
            >
              Ecommerce Heatmaps:<br />
              <span style={{ color: COLOR.accent }}>See What Your Visitors See</span>
            </h1>

            <p
              style={{
                fontFamily: "Georgia, serif",
                fontSize: "15px",
                lineHeight: 1.75,
                color: COLOR.body,
                marginBottom: "32px",
                maxWidth: "520px",
              }}
            >
              The most comprehensive research-backed resource on scroll maps, click maps, move maps,
              and behavioral analytics for ecommerce stores. Every article is built from real data,
              not theory, to help you understand exactly where your store loses revenue and how to
              fix it.{" "}
              <a
                href="https://heatmap.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: COLOR.link, textDecoration: "underline", textUnderlineOffset: "3px" }}
              >
                Heatmap
              </a>{" "}
              is a great place to start if you're looking for a tool built specifically for ecommerce
              revenue tracking.
            </p>

            <Link href={`/articles/${articles[0].slug}`}>
              <button
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  background: COLOR.accent,
                  color: "#fff",
                  border: "none",
                  padding: "14px 28px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = "0.85")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = "1")}
              >
                START READING <ArrowRight size={12} />
              </button>
            </Link>
        </div>
      </section>

      {/* ── Featured Article ── */}
      <section
        style={{
          maxWidth: "860px",
          margin: "0 auto",
          padding: "48px clamp(24px, 6vw, 64px) 32px",
        }}
      >
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "10px",
            color: COLOR.tertiary,
            letterSpacing: "0.1em",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <BookOpen size={11} style={{ color: COLOR.accent }} />
          START HERE — RECOMMENDED FIRST READ
        </div>

        <Link href={`/articles/${featured.slug}`}>
          <div
            style={{
              border: `1px solid #1f1f1f`,
              borderLeft: `3px solid ${COLOR.accent}`,
              borderRadius: "4px",
              overflow: "hidden",
              cursor: "pointer",
              transition: "border-color 0.15s, background 0.15s",
              background: COLOR.bgCard,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = "#111";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = COLOR.bgCard;
            }}
          >
            <div style={{ width: "100%", height: "220px", overflow: "hidden" }}>
              <img
                src={featured.thumbnail}
                alt={featured.altText}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                loading="eager"
              />
            </div>
            <div style={{ padding: "24px" }}>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "10px",
                  color: COLOR.accent,
                  letterSpacing: "0.08em",
                  marginBottom: "10px",
                }}
              >
                {featured.category.toUpperCase()}
              </div>
              <h2
                style={{
                  fontFamily: "Georgia, serif",
                  fontSize: "22px",
                  fontWeight: 700,
                  color: COLOR.primary,
                  lineHeight: 1.3,
                  marginBottom: "12px",
                }}
              >
                {featured.title}
              </h2>
              <p
                style={{
                  fontFamily: "Georgia, serif",
                  fontSize: "14px",
                  color: COLOR.secondary,
                  lineHeight: 1.7,
                  marginBottom: "20px",
                }}
              >
                {featured.excerpt}
              </p>
              <span
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "10px",
                  color: COLOR.accent,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  letterSpacing: "0.06em",
                }}
              >
                READ ARTICLE <ArrowRight size={10} />
              </span>
            </div>
          </div>
        </Link>
      </section>

      {/* ── Body paragraphs ── */}
      <section
        style={{
          maxWidth: "860px",
          margin: "0 auto",
          padding: "0 clamp(24px, 6vw, 64px) 56px",
        }}
      >
        <h2
          style={{
            fontFamily: "Georgia, serif",
            fontSize: "1.4rem",
            fontWeight: 700,
            color: COLOR.primary,
            lineHeight: 1.3,
            marginBottom: "20px",
          }}
        >
          What Heatmaps Reveal That Analytics Cannot
        </h2>
        <div
          style={{
            fontFamily: "Georgia, serif",
            fontSize: "15px",
            lineHeight: 1.8,
            color: COLOR.body,
          }}
        >
          <p style={{ marginBottom: "1.2rem" }}>
            Google Analytics tells you a visitor bounced. A heatmap tells you they scrolled 40% down
            the product page, hovered over the size chart for six seconds, and left without clicking
            Add to Cart. That is the difference between knowing something went wrong and knowing
            exactly where and why. For ecommerce stores, that specificity is what turns data into
            revenue.
          </p>
          <p>
            This site covers every major heatmap type used in ecommerce: scroll maps, click maps,
            move maps, mobile heatmaps, and the emerging AI tools that are changing how behavioral
            data gets interpreted. Every article is built around patterns observed in real store data,
            written for operators and conversion teams who need answers they can act on the same day
            they read them.
          </p>
        </div>
      </section>

      {/* ── Topic Sections ── */}
      {topicSections.map((section) => (
        <section
          key={section.slug}
          id={section.slug}
          style={{
            maxWidth: "860px",
            margin: "0 auto",
            padding: "0 clamp(24px, 6vw, 64px) 56px",
            scrollMarginTop: "80px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              borderBottom: `1px solid ${COLOR.border}`,
              paddingBottom: "12px",
              marginBottom: "24px",
            }}
          >
            <h2
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "0.75rem",
                fontWeight: 700,
                color: COLOR.primary,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              // {section.label}
            </h2>
            <span
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "10px",
                color: COLOR.tertiary,
                letterSpacing: "0.06em",
              }}
            >
              {section.items.length} ARTICLE{section.items.length !== 1 ? "S" : ""}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {section.items.map((article, idx) => (
              <Link key={article.id} href={`/articles/${article.slug}`}>
                <div
                  style={{
                    borderBottom: `1px solid #111`,
                    padding: "20px 0",
                    cursor: "pointer",
                    transition: "padding-left 0.1s, background 0.1s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = "#0f0f0f";
                    (e.currentTarget as HTMLDivElement).style.paddingLeft = "8px";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = "transparent";
                    (e.currentTarget as HTMLDivElement).style.paddingLeft = "0";
                  }}
                >
                  <div className="article-tile-inner" style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                    <span
                      style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: "10px",
                        color: COLOR.tertiary,
                        minWidth: "20px",
                        paddingTop: "3px",
                        flexShrink: 0,
                      }}
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div
                      className="article-thumb"
                      style={{
                        flexShrink: 0,
                        borderRadius: "3px",
                        overflow: "hidden",
                        border: `1px solid ${COLOR.border}`,
                      }}
                    >
                      <img
                        src={article.thumbnail}
                        alt={article.altText}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        loading="lazy"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3
                        style={{
                          fontFamily: "Georgia, serif",
                          fontSize: "16px",
                          fontWeight: 700,
                          color: COLOR.primary,
                          lineHeight: 1.35,
                          marginBottom: "6px",
                        }}
                      >
                        {article.title}
                      </h3>
                      <p
                        style={{
                          fontFamily: "Georgia, serif",
                          fontSize: "13px",
                          color: COLOR.secondary,
                          lineHeight: 1.6,
                          marginBottom: "10px",
                        }}
                      >
                        {article.excerpt}
                      </p>
                      <span
                        style={{
                          fontFamily: "'Space Mono', monospace",
                          fontSize: "10px",
                          color: COLOR.accent,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        READ ARTICLE <ArrowRight size={10} />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {/* ── About section ── */}
      <section
        style={{
          borderTop: `1px solid ${COLOR.border}`,
          padding: "60px clamp(24px, 6vw, 64px)",
          maxWidth: "860px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "10px",
            color: COLOR.accent,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: "20px",
          }}
        >
          » ABOUT THIS SITE
        </div>

        <h2
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "1.1rem",
            fontWeight: 700,
            color: COLOR.primary,
            marginBottom: "20px",
          }}
        >
          // Built for ecommerce operators
        </h2>

        <div style={{ fontFamily: "Georgia, serif", fontSize: "14px", lineHeight: 1.8, color: COLOR.secondary }}>
          <p style={{ marginBottom: "1rem" }}>
            Ecommerce Heatmaps is a resource for online store owners and conversion specialists who want to
            understand user behavior and improve their sites. Every article is practical, specific, and
            actionable. No filler.
          </p>
          <p>
            Whether you're running a Shopify store, a WooCommerce site, or a custom platform, the
            principles here apply. User behavior is user behavior. The data tells you what to fix. We help
            you read it.
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        style={{
          borderTop: `1px solid ${COLOR.border}`,
          padding: "40px clamp(24px, 6vw, 64px) 32px",
          maxWidth: "860px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "32px",
            marginBottom: "32px",
          }}
        >
          {/* Column 1: Site description with primary keyword */}
          <div>
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "11px",
                fontWeight: 700,
                color: COLOR.primary,
                letterSpacing: "0.06em",
                marginBottom: "12px",
              }}
            >
              ECOMMERCE HEATMAPS
            </div>
            <p
              style={{
                fontFamily: "Georgia, serif",
                fontSize: "13px",
                color: COLOR.secondary,
                lineHeight: 1.7,
              }}
            >
              The complete guide to using heatmaps for ecommerce. Practical articles on scroll maps,
              click maps, move maps, mobile optimization, and AI-powered behavioral analytics.
            </p>
            <a
              href="https://heatmap.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                marginTop: "12px",
                fontFamily: "'Space Mono', monospace",
                fontSize: "10px",
                color: COLOR.link,
                textDecoration: "underline",
                textUnderlineOffset: "3px",
                letterSpacing: "0.04em",
              }}
            >
              Try Heatmap.com →
            </a>
          </div>

          {/* Column 2: Topic categories */}
          <div>
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "11px",
                fontWeight: 700,
                color: COLOR.primary,
                letterSpacing: "0.06em",
                marginBottom: "12px",
              }}
            >
              TOPICS
            </div>
            <nav style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {topicSections.map((sec) => (
                <a
                  key={sec.slug}
                  href={`/#${sec.slug}`}
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "10px",
                    color: COLOR.tertiary,
                    textDecoration: "none",
                    letterSpacing: "0.04em",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    transition: "color 0.1s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = COLOR.body)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = COLOR.tertiary)}
                >
                  <span>{sec.label}</span>
                  <span style={{ color: COLOR.faint }}>{sec.items.length}</span>
                </a>
              ))}
            </nav>
          </div>
        </div>

        {/* Footer bottom */}
        <div
          style={{
            borderTop: `1px solid ${COLOR.border}`,
            paddingTop: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <p
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "10px",
              color: COLOR.faint,
              letterSpacing: "0.05em",
            }}
          >
            © {new Date().getFullYear()} ECOMMERCEHEATMAPS.COM
          </p>
          <p
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "10px",
              color: COLOR.faint,
              letterSpacing: "0.04em",
            }}
          >
            ALL ARTICLES WRITTEN BY HUMAN EXPERTS
          </p>
        </div>
      </footer>
    </div>
  );
}
