import { getButtonTextColor } from './indexCssBuilder.js';

interface SiteConfig {
  domain: string;
  siteName: string;
  accentColor: string;
  categories: { label: string; slug: string }[];
}

function esc(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n");
}

export function buildCategoryPageTsx(
  siteConfig: SiteConfig,
  articles: { slug: string; title: string; categorySlug: string; categoryLabel: string; metaDescription: string; excerpt: string }[]
): string {
  const siteUrl = `https://${siteConfig.domain}`;

  // Build a SEO map for categories derived from articles
  const catSeoEntries = siteConfig.categories
    .map((c) => {
      const catArticles = articles.filter((a) => a.categorySlug === c.slug);
      const metaTitle = `${c.label} | ${siteConfig.siteName}`;
      const metaDescription = `Browse ${catArticles.length} articles about ${c.label.toLowerCase()} on ${siteConfig.siteName}.`;
      const h1 = c.label;
      const intro = metaDescription;
      return `  "${c.slug}": { metaTitle: '${esc(metaTitle)}', metaDescription: '${esc(metaDescription)}', h1: '${esc(h1)}', intro: '${esc(intro)}' }`;
    })
    .join(",\n");

  return `import { Link, useLocation } from "wouter";
import { articles, CATEGORIES } from "../data/articles";
import { useEffect } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { useState } from "react";

const CATEGORY_SEO: Record<string, { metaTitle: string; metaDescription: string; h1: string; intro: string }> = {
${catSeoEntries}
};

export default function CategoryPage() {
  const [location] = useLocation();
  const slug = location.replace(/^\\//, "");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const catInfo = CATEGORIES.find((c) => c.slug === slug);
  const seo = CATEGORY_SEO[slug] || {};
  const categoryArticles = articles.filter((a) => a.categorySlug === slug);
  const topicSections = CATEGORIES.filter((c) => c.slug !== "all").map((cat) => ({
    ...cat,
    items: articles.filter((a) => a.categorySlug === cat.slug),
  })).filter((s) => s.items.length > 0);

  useEffect(() => {
    if (!catInfo) return;

    document.title = seo.metaTitle || catInfo.label;

    const setMeta = (selector: string, attr: string, value: string, attrName: string) => {
      let el = document.querySelector(selector) as HTMLElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attr);
        document.head.appendChild(el);
      }
      el.setAttribute('content', value);
    };

    const desc = seo.metaDescription || '';
    const pageUrl = '${esc(siteUrl)}/' + slug;

    setMeta('meta[name="description"]', 'description', desc, 'name');
    setMeta('meta[property="og:title"]', 'og:title', seo.metaTitle || catInfo.label, 'property');
    setMeta('meta[property="og:description"]', 'og:description', desc, 'property');
    setMeta('meta[property="og:url"]', 'og:url', pageUrl, 'property');
    setMeta('meta[property="og:type"]', 'og:type', 'website', 'property');
    setMeta('meta[property="og:site_name"]', 'og:site_name', '${esc(siteConfig.siteName)}', 'property');
    setMeta('meta[name="twitter:card"]', 'twitter:card', 'summary_large_image', 'name');
    setMeta('meta[name="twitter:title"]', 'twitter:title', seo.metaTitle || catInfo.label, 'name');
    setMeta('meta[name="twitter:description"]', 'twitter:description', desc, 'name');

    const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (canonical) canonical.setAttribute('href', pageUrl);

    // JSON-LD CollectionPage
    const existingScript = document.querySelector('script[data-schema="collection"]');
    if (existingScript) existingScript.remove();
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-schema', 'collection');
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": seo.h1 || catInfo.label,
      "description": desc,
      "url": pageUrl,
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": '${esc(siteUrl)}' },
          { "@type": "ListItem", "position": 2, "name": catInfo.label, "item": pageUrl },
        ]
      }
    });
    document.head.appendChild(script);
  }, [slug, catInfo]);

  if (!catInfo) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#666", fontFamily: "monospace" }}>Category not found</div>
      </div>
    );
  }

  const COLOR = {
    primary: "#f0f0f0",
    body: "#c8c8c8",
    secondary: "#aaaaaa",  // 5.0:1 contrast on #0a0a0a - WCAG AA pass
    tertiary: "#9a9a9a",  // 4.7:1 contrast on #0a0a0a - WCAG AA pass
    faint: "#777777",     // 4.0:1 - decorative only, never body copy
    accent: "${siteConfig.accentColor}",
    bg: "#0a0a0a",
    bgCard: "#0d0d0d",
    border: "#1e1e1e",
  };

  return (
    <div style={{ minHeight: "100vh", background: COLOR.bg, color: COLOR.body, overflowX: "hidden", maxWidth: "100vw" }}>
      {/* Nav */}
      <header style={{ borderBottom: \`1px solid \${COLOR.border}\`, position: "sticky", top: 0, zIndex: 50, background: COLOR.bg }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px clamp(24px, 5vw, 64px)" }}>
          <Link href="/">
            <span style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: "13px", color: COLOR.accent, letterSpacing: "0.05em", cursor: "pointer", textTransform: "uppercase" }}>
              ${esc(siteConfig.siteName)}
            </span>
          </Link>
          <nav style={{ display: "flex", alignItems: "center", gap: "20px" }} className="hidden-mobile">
            {topicSections.map((sec) => (
              <Link key={sec.slug} href={\`/\${sec.slug}\`}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: sec.slug === slug ? COLOR.accent : COLOR.tertiary, letterSpacing: "0.06em", cursor: "pointer" }}>
                  {sec.label.toUpperCase()}
                </span>
              </Link>
            ))}
          </nav>
          <button className="mobile-only" onClick={() => setMobileNavOpen((v) => !v)} style={{ background: "none", border: "none", color: COLOR.secondary, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontFamily: "'Space Mono', monospace", fontSize: "10px" }}>
            {mobileNavOpen ? <X size={16} /> : <Menu size={16} />}
            <span>{mobileNavOpen ? "CLOSE" : "TOPICS"}</span>
          </button>
        </div>
        {mobileNavOpen && (
          <div className="mobile-only" style={{ borderTop: \`1px solid \${COLOR.border}\`, background: COLOR.bg, padding: "8px 0", flexDirection: "column" }}>
            {topicSections.map((sec) => (
              <Link key={sec.slug} href={\`/\${sec.slug}\`}>
                <div onClick={() => setMobileNavOpen(false)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px clamp(24px, 5vw, 64px)", fontFamily: "'Space Mono', monospace", fontSize: "11px", letterSpacing: "0.08em", color: COLOR.secondary, cursor: "pointer" }}>
                  <span>{sec.label.toUpperCase()}</span>
                  <span style={{ color: COLOR.faint }}>→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* Hero */}
      <section style={{ borderBottom: \`1px solid \${COLOR.border}\`, padding: "clamp(40px, 8vw, 72px) clamp(24px, 6vw, 64px) clamp(32px, 5vw, 56px)", maxWidth: "860px", margin: "0 auto" }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: COLOR.accent, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "16px" }}>
          » {catInfo.label.toUpperCase()}
        </div>
        <h1 style={{ fontFamily: "'Space Mono', monospace", fontSize: "clamp(1.4rem, 3.5vw, 2rem)", fontWeight: 700, color: COLOR.primary, lineHeight: 1.2, marginBottom: "16px" }}>
          {seo.h1 || catInfo.label}
        </h1>
        <p style={{ fontFamily: "Georgia, serif", fontSize: "15px", lineHeight: 1.75, color: COLOR.body, maxWidth: "520px" }}>
          {seo.intro}
        </p>
        <div style={{ marginTop: "16px", fontFamily: "'Space Mono', monospace", fontSize: "10px", color: COLOR.tertiary }}>
          {categoryArticles.length} ARTICLE{categoryArticles.length !== 1 ? "S" : ""}
        </div>
      </section>

      {/* Articles */}
      <section style={{ maxWidth: "860px", margin: "0 auto", padding: "40px clamp(24px, 6vw, 64px) 80px" }}>
        {categoryArticles.length === 0 ? (
          <p style={{ color: COLOR.tertiary, fontFamily: "'Space Mono', monospace", fontSize: "12px" }}>No articles in this category yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {categoryArticles.map((article, idx) => (
              <Link key={article.id} href={\`/articles/\${article.slug}\`}>
                <div
                  style={{ borderBottom: \`1px solid #111\`, padding: "20px 0", cursor: "pointer", transition: "padding-left 0.1s, background 0.1s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#0f0f0f"; (e.currentTarget as HTMLDivElement).style.paddingLeft = "8px"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; (e.currentTarget as HTMLDivElement).style.paddingLeft = "0"; }}
                >
                  <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: COLOR.tertiary, minWidth: "20px", paddingTop: "3px", flexShrink: 0 }}>
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    {article.thumbnail && (
                      <div className="thumb-list" style={{ flexShrink: 0, borderRadius: "3px", overflow: "hidden", border: \`1px solid \${COLOR.border}\` }}>
                        <img src={article.thumbnail} alt={article.altText} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <h2 style={{ fontFamily: "Georgia, serif", fontSize: "16px", fontWeight: 700, color: COLOR.primary, lineHeight: 1.35, marginBottom: "6px" }}>
                        {article.title}
                      </h2>
                      <p style={{ fontFamily: "Georgia, serif", fontSize: "13px", color: COLOR.secondary, lineHeight: 1.6, marginBottom: "10px" }}>
                        {article.excerpt}
                      </p>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: COLOR.accent, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        READ ARTICLE <ArrowRight size={10} />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Other categories */}
      <section style={{ borderTop: \`1px solid \${COLOR.border}\`, padding: "40px clamp(24px, 6vw, 64px)", maxWidth: "860px", margin: "0 auto" }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: COLOR.tertiary, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "20px" }}>
          // MORE TOPICS
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {topicSections.filter((s) => s.slug !== slug).map((sec) => (
            <Link key={sec.slug} href={\`/\${sec.slug}\`}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.08em", padding: "8px 14px", border: \`1px solid \${COLOR.border}\`, color: COLOR.secondary, cursor: "pointer", borderRadius: "2px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                {sec.label.toUpperCase()} <span style={{ color: COLOR.faint }}>{sec.items.length}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
`;
}
