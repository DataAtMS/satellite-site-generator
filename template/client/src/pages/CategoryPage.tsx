// CategoryPage — dedicated collection page per topic category
// Design: Minimal Dark Terminal — same system as Home.tsx and ArticlePage.tsx
// Route: /[category-slug] (e.g. /scroll-maps, /move-maps, /mobile)
// SEO: unique H1, meta description, canonical, structured data per category

import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { articles, CATEGORIES } from "@/data/articles";
import { ArrowRight, ArrowLeft, Menu, X } from "lucide-react";

const COLOR = {
  primary: "#f0f0f0",
  body: "#c8c8c8",
  secondary: "#999",
  tertiary: "#777",
  faint: "#555",
  accent: "#ff0066",
  link: "#cc4466",
  bg: "#0a0a0a",
  bgCard: "#0d0d0d",
  border: "#1a1a1a",
};

// Per-category SEO copy: H1, meta description, intro paragraph
const CATEGORY_META: Record<string, {
  h1: string;
  metaDescription: string;
  intro: string;
}> = {
  "scroll-maps": {
    h1: "Scroll Maps for Ecommerce",
    metaDescription: "Learn how scroll maps reveal where visitors stop reading on your ecommerce pages. Practical guides on reading scroll data and improving conversions.",
    intro: "Scroll maps show you exactly how far down each page your visitors scroll before they leave. For ecommerce stores, that data is the difference between guessing why a product page underperforms and knowing precisely where you lost the sale. Every article in this collection is built around real scroll data patterns observed across ecommerce sites.",
  },
  "move-maps": {
    h1: "Move Maps for Ecommerce",
    metaDescription: "Move maps track where visitors move their cursor on your ecommerce pages. Learn how to read move map data and use it to improve product page performance.",
    intro: "Move maps track cursor movement across your pages, revealing where visitors pause, hesitate, and lose interest before they click. On ecommerce product pages, cursor behavior often predicts purchase intent. This collection covers how to read move map data and translate it into specific layout and copy improvements.",
  },
  "mobile": {
    h1: "Mobile Heatmaps for Ecommerce",
    metaDescription: "Mobile heatmaps show how shoppers interact with your store on phones and tablets. Guides on mobile scroll depth, tap patterns, and conversion optimization.",
    intro: "More than 60% of ecommerce traffic now comes from mobile devices, but most stores are still optimized for desktop behavior. Mobile heatmaps reveal how shoppers actually tap, scroll, and navigate on small screens. This collection covers the patterns that matter most for mobile conversion rate.",
  },
  "ai-future": {
    h1: "AI and the Future of Ecommerce Heatmaps",
    metaDescription: "How AI is changing heatmap analysis for ecommerce. Predictive click maps, automated insights, and what behavioral analytics looks like in the next five years.",
    intro: "AI is changing what heatmap tools can do. Predictive click maps, automated pattern detection, and session replay analysis that used to require hours of manual review can now surface insights in minutes. This collection covers what AI-powered behavioral analytics means for ecommerce operators today and where it is heading.",
  },
  "ethics-privacy": {
    h1: "Heatmap Ethics and Privacy for Ecommerce",
    metaDescription: "How to use heatmaps on your ecommerce store without violating visitor privacy. GDPR compliance, consent requirements, and ethical data collection practices.",
    intro: "Running heatmaps on your store means collecting behavioral data from real people. Done right, it is legal, ethical, and valuable. Done wrong, it can expose you to GDPR fines, erode customer trust, and create legal liability. This collection covers what you need to know about consent, data retention, and responsible heatmap use.",
  },
};

export default function CategoryPage() {
  const [location] = useLocation();
  // Derive slug from the current path (e.g. "/scroll-maps" → "scroll-maps")
  const slug = location.replace(/^\//, "").split("?")[0];
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const category = CATEGORIES.find((c) => c.slug === slug);
  const categoryArticles = articles.filter((a) => a.categorySlug === slug);
  const meta = CATEGORY_META[slug];

  useEffect(() => {
    if (!category || !meta) return;
    document.title = `${meta.h1} | Ecommerce Heatmaps`;

    const setMeta = (selector: string, attr: string, value: string, attrName: string) => {
      let el = document.querySelector(selector) as HTMLElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attr);
        document.head.appendChild(el);
      }
      el.setAttribute('content', value);
    };

    const pageUrl = `https://ecommerceheatmaps.com/${slug}`;
    const ogImg = categoryArticles[0]?.thumbnail ||
      'https://d2xsxph8kpxj0f.cloudfront.net/310519663404057351/dp2m2KZzpEAJHK3xhXkoSn/thumb-scroll-maps-aKxzx3iNqL4oz5GZCqDCWQ.webp';

    setMeta('meta[name="description"]', 'description', meta.metaDescription, 'name');
    setMeta('meta[property="og:title"]', 'og:title', `${meta.h1} | Ecommerce Heatmaps`, 'property');
    setMeta('meta[property="og:description"]', 'og:description', meta.metaDescription, 'property');
    setMeta('meta[property="og:image"]', 'og:image', ogImg, 'property');
    setMeta('meta[property="og:url"]', 'og:url', pageUrl, 'property');
    setMeta('meta[property="og:type"]', 'og:type', 'website', 'property');
    setMeta('meta[property="og:site_name"]', 'og:site_name', 'Ecommerce Heatmaps', 'property');
    setMeta('meta[name="twitter:card"]', 'twitter:card', 'summary_large_image', 'name');
    setMeta('meta[name="twitter:title"]', 'twitter:title', `${meta.h1} | Ecommerce Heatmaps`, 'name');
    setMeta('meta[name="twitter:description"]', 'twitter:description', meta.metaDescription, 'name');
    setMeta('meta[name="twitter:image"]', 'twitter:image', ogImg, 'name');
    setMeta('meta[name="twitter:site"]', 'twitter:site', '@ecomheatmaps', 'name');

    const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (canonical) canonical.setAttribute("href", pageUrl);

    // JSON-LD structured data for collection page
    const existingLd = document.getElementById("category-ld");
    if (existingLd) existingLd.remove();
    const script = document.createElement("script");
    script.id = "category-ld";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": meta.h1,
      "description": meta.metaDescription,
      "url": `https://ecommerceheatmaps.com/${slug}`,
      "mainEntity": {
        "@type": "ItemList",
        "itemListElement": categoryArticles.map((a, i) => ({
          "@type": "ListItem",
          "position": i + 1,
          "url": `https://ecommerceheatmaps.com/articles/${a.slug}`,
          "name": a.title,
        })),
      },
    });
    document.head.appendChild(script);

    // JSON-LD: BreadcrumbList
    const existingBc = document.getElementById("category-breadcrumb-ld");
    if (existingBc) existingBc.remove();
    const bcScript = document.createElement("script");
    bcScript.id = "category-breadcrumb-ld";
    bcScript.type = "application/ld+json";
    bcScript.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://ecommerceheatmaps.com/" },
        { "@type": "ListItem", "position": 2, "name": meta.h1, "item": `https://ecommerceheatmaps.com/${slug}` },
      ],
    });
    document.head.appendChild(bcScript);

    return () => {
      const ld = document.getElementById("category-ld");
      if (ld) ld.remove();
      const bc = document.getElementById("category-breadcrumb-ld");
      if (bc) bc.remove();
    };
  }, [slug, category, meta, categoryArticles]);

  if (!category || !meta) {
    return (
      <div style={{ minHeight: "100vh", background: COLOR.bg, color: COLOR.body, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "13px", color: COLOR.tertiary }}>
          Category not found. <Link href="/"><span style={{ color: COLOR.accent, cursor: "pointer" }}>Go home →</span></Link>
        </div>
      </div>
    );
  }

  const otherCategories = CATEGORIES.filter((c) => c.slug !== "all" && c.slug !== slug);

  return (
    <div style={{ minHeight: "100vh", background: COLOR.bg, color: COLOR.body }}>

      {/* ── Top nav bar ── */}
      <header style={{ borderBottom: `1px solid ${COLOR.border}`, position: "sticky", top: 0, zIndex: 50, background: COLOR.bg }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 24px", maxWidth: "860px", margin: "0 auto" }}>
          <Link href="/">
            <span style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: "13px", color: COLOR.accent, letterSpacing: "0.05em", cursor: "pointer" }}>
              ECOMMERCE HEATMAPS
            </span>
          </Link>
          {/* Desktop nav */}
          <nav className="hidden-mobile" style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            {CATEGORIES.filter((c) => c.slug !== "all").map((cat) => (
              <Link key={cat.slug} href={`/${cat.slug}`}>
                <span
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "10px",
                    color: cat.slug === slug ? COLOR.accent : COLOR.tertiary,
                    letterSpacing: "0.06em",
                    textDecoration: "none",
                    cursor: "pointer",
                    borderBottom: cat.slug === slug ? `1px solid ${COLOR.accent}` : "1px solid transparent",
                    paddingBottom: "2px",
                  }}
                >
                  {cat.label.toUpperCase()}
                </span>
              </Link>
            ))}
          </nav>
          {/* Mobile hamburger */}
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
        {/* Mobile dropdown */}
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
            {CATEGORIES.filter((c) => c.slug !== "all").map((cat) => (
              <Link key={cat.slug} href={`/${cat.slug}`}>
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
                    color: cat.slug === slug ? COLOR.accent : COLOR.secondary,
                    borderLeft: cat.slug === slug ? `2px solid ${COLOR.accent}` : "2px solid transparent",
                    cursor: "pointer",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#0f0f0f"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                >
                  <span>{cat.label.toUpperCase()}</span>
                  <span style={{ color: COLOR.faint, fontSize: "10px" }}>→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* ── Breadcrumb ── */}
      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "24px clamp(24px, 6vw, 64px) 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Link href="/">
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: COLOR.faint, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
              <ArrowLeft size={10} /> HOME
            </span>
          </Link>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: COLOR.border }}>/</span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: COLOR.accent, letterSpacing: "0.08em" }}>
            {category.label.toUpperCase()}
          </span>
        </div>
      </div>

      {/* ── Hero / H1 ── */}
      <section style={{ maxWidth: "860px", margin: "0 auto", padding: "40px clamp(24px, 6vw, 64px) 48px", borderBottom: `1px solid ${COLOR.border}` }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: COLOR.accent, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "16px" }}>
          » {category.label.toUpperCase()} — {categoryArticles.length} ARTICLE{categoryArticles.length !== 1 ? "S" : ""}
        </div>
        <h1 style={{ fontFamily: "'Space Mono', monospace", fontSize: "clamp(1.4rem, 3.5vw, 2rem)", fontWeight: 700, color: COLOR.primary, lineHeight: 1.2, marginBottom: "20px", letterSpacing: "-0.02em" }}>
          {meta.h1}
        </h1>
        <p style={{ fontFamily: "Georgia, serif", fontSize: "15px", lineHeight: 1.8, color: COLOR.body, maxWidth: "620px" }}>
          {meta.intro}
        </p>
      </section>

      {/* ── Article list ── */}
      <section style={{ maxWidth: "860px", margin: "0 auto", padding: "0 clamp(24px, 6vw, 64px) 64px" }}>
        {categoryArticles.length === 0 ? (
          <div style={{ padding: "64px 0", fontFamily: "'Space Mono', monospace", fontSize: "12px", color: COLOR.tertiary }}>
            No articles in this category yet. Check back soon.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {categoryArticles.map((article, idx) => (
              <Link key={article.id} href={`/articles/${article.slug}`}>
                <div
                  style={{ borderBottom: `1px solid #111`, padding: "28px 0", cursor: "pointer", transition: "padding-left 0.1s, background 0.1s" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = "#0f0f0f";
                    (e.currentTarget as HTMLDivElement).style.paddingLeft = "8px";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = "transparent";
                    (e.currentTarget as HTMLDivElement).style.paddingLeft = "0";
                  }}
                >
                  <div className="article-tile-inner" style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
                    {/* Index number */}
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: COLOR.tertiary, minWidth: "24px", paddingTop: "4px", flexShrink: 0 }}>
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    {/* Thumbnail */}
                    <div className="article-thumb" style={{ flexShrink: 0, borderRadius: "3px", overflow: "hidden", border: `1px solid ${COLOR.border}` }}>
                      <img
                        src={article.thumbnail}
                        alt={article.altText}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        loading="lazy"
                      />
                    </div>
                    {/* Text */}
                    <div style={{ flex: 1 }}>
                      <h2 style={{ fontFamily: "Georgia, serif", fontSize: "18px", fontWeight: 700, color: COLOR.primary, lineHeight: 1.3, marginBottom: "8px" }}>
                        {article.title}
                      </h2>
                      <p style={{ fontFamily: "Georgia, serif", fontSize: "14px", color: COLOR.secondary, lineHeight: 1.65, marginBottom: "12px" }}>
                        {article.excerpt}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: COLOR.accent, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          READ ARTICLE <ArrowRight size={10} />
                        </span>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: COLOR.faint }}>
                          {article.datePublished}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── Other categories ── */}
      <section style={{ borderTop: `1px solid ${COLOR.border}`, maxWidth: "860px", margin: "0 auto", padding: "48px clamp(24px, 6vw, 64px) 64px" }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: COLOR.tertiary, letterSpacing: "0.1em", marginBottom: "24px" }}>
          MORE TOPICS
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
          {otherCategories.map((cat) => {
            const count = articles.filter((a) => a.categorySlug === cat.slug).length;
            return (
              <Link key={cat.slug} href={`/${cat.slug}`}>
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "11px",
                    color: COLOR.secondary,
                    border: `1px solid ${COLOR.border}`,
                    padding: "10px 16px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    transition: "border-color 0.1s, color 0.1s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = COLOR.accent;
                    (e.currentTarget as HTMLDivElement).style.color = COLOR.primary;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = COLOR.border;
                    (e.currentTarget as HTMLDivElement).style.color = COLOR.secondary;
                  }}
                >
                  {cat.label}
                  <span style={{ color: COLOR.faint, fontSize: "10px" }}>{count}</span>
                </div>
              </Link>
            );
          })}
          <Link href="/">
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "11px",
                color: COLOR.secondary,
                border: `1px solid ${COLOR.border}`,
                padding: "10px 16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "border-color 0.1s, color 0.1s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = COLOR.accent;
                (e.currentTarget as HTMLDivElement).style.color = COLOR.primary;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = COLOR.border;
                (e.currentTarget as HTMLDivElement).style.color = COLOR.secondary;
              }}
            >
              ← All Articles
            </div>
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: `1px solid ${COLOR.border}`, padding: "32px clamp(24px, 6vw, 64px)", maxWidth: "860px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
          <Link href="/">
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "11px", fontWeight: 700, color: COLOR.accent, cursor: "pointer" }}>
              ECOMMERCE HEATMAPS
            </span>
          </Link>
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: COLOR.faint }}>
            © {new Date().getFullYear()} ECOMMERCEHEATMAPS.COM
          </p>
        </div>
      </footer>

    </div>
  );
}
