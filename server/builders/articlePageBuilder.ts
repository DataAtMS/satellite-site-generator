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

export function buildArticlePageTsx(siteConfig: SiteConfig): string {
  const siteUrl = `https://${siteConfig.domain}`;
  // Compute WCAG-accessible button text color in outer scope so it can be interpolated
  const btnTextColor = getButtonTextColor(siteConfig.accentColor);
  return `import { Link, useParams } from "wouter";
import { articles, CATEGORIES } from "../data/articles";
import { useEffect, useState, useRef } from "react";
import { ArrowRight, Menu, X } from "lucide-react";

// Simple markdown renderer
function renderMarkdown(md: string): string {
  return md
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 id="' + '$1'.replace(/[^a-z0-9]/gi, '-').toLowerCase() + '">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold and italic
    .replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>')
    .replace(/\\*(.+?)\\*/g, '<em>$1</em>')
    // Links
    .replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a href="$2">$1</a>')
    // Tables: detect header row, separator row, and data rows for proper thead/th structure
    .replace(/((?:^\\|.+\\|\\n?)+)/gm, (tableBlock) => {
      const rows = tableBlock.trim().split('\\n').filter(r => r.trim().startsWith('|'));
      if (rows.length < 2) return tableBlock;
      let html = '<table>';
      let inBody = false;
      let headerDone = false;
      rows.forEach((row) => {
        const cells = row.split('|').filter(Boolean).map(c => c.trim());
        // Separator row (---|---|---)
        if (cells.every(c => /^[-:\\s]+$/.test(c))) {
          if (!headerDone) { html += '</thead><tbody>'; headerDone = true; inBody = true; }
          return;
        }
        if (!headerDone) {
          // First row = header
          html += '<thead><tr>' + cells.map(c => \`<th>\${c}</th>\`).join('') + '</tr>';
        } else {
          html += '<tr>' + cells.map(c => \`<td>\${c}</td>\`).join('') + '</tr>';
        }
      });
      if (inBody) html += '</tbody>';
      else if (!headerDone) html += '</thead>'; // no separator found
      html += '</table>';
      return html;
    })
    // List items
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/((<li>.+<\\/li>\\n?)+)/g, '<ul>$1</ul>')
    // Paragraphs
    .replace(/^(?!<[a-z]|\\s*$)(.+)$/gm, '<p>$1</p>')
    // Line breaks
    .replace(/\\n{2,}/g, '');
}

export default function ArticlePage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeHeading, setActiveHeading] = useState('');
  const [headings, setHeadings] = useState<{ id: string; text: string }[]>([]);
  const [readProgress, setReadProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  const article = articles.find((a) => a.slug === slug);
  const topicSections = CATEGORIES.filter((c) => c.slug !== "all").map((cat) => ({
    ...cat,
    items: articles.filter((a) => a.categorySlug === cat.slug),
  })).filter((s) => s.items.length > 0);

  const categoryArticles = article ? articles.filter((a) => a.categorySlug === article.categorySlug && a.slug !== article.slug) : [];
  const nextArticle = categoryArticles[0] || null;

  // Article index within its category (e.g. "2 / 5")
  const categoryAllArticles = article ? articles.filter((a) => a.categorySlug === article.categorySlug) : [];
  const articleIndex = article ? categoryAllArticles.findIndex((a) => a.slug === article.slug) + 1 : 0;

  // Cross-category FURTHER READING: 3 articles from OTHER categories
  const furtherReading = article
    ? articles.filter((a) => a.categorySlug !== article.categorySlug && a.slug !== article.slug).slice(0, 3)
    : [];

  useEffect(() => {
    if (!article) return;

    document.title = article.title + ' | ${esc(siteConfig.siteName)}';

    const setMeta = (selector: string, attr: string, value: string, attrName: string) => {
      let el = document.querySelector(selector) as HTMLElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attr);
        document.head.appendChild(el);
      }
      el.setAttribute('content', value);
    };

    const pageUrl = '${esc(siteUrl)}/articles/' + article.slug;
    const catUrl = '${esc(siteUrl)}/' + article.categorySlug;

    setMeta('meta[name="description"]', 'description', article.metaDescription, 'name');
    setMeta('meta[property="og:title"]', 'og:title', article.title, 'property');
    setMeta('meta[property="og:description"]', 'og:description', article.metaDescription, 'property');
    setMeta('meta[property="og:image"]', 'og:image', article.thumbnail || '', 'property');
    setMeta('meta[property="og:url"]', 'og:url', pageUrl, 'property');
    setMeta('meta[property="og:type"]', 'og:type', 'article', 'property');
    setMeta('meta[property="og:site_name"]', 'og:site_name', '${esc(siteConfig.siteName)}', 'property');
    setMeta('meta[name="twitter:card"]', 'twitter:card', 'summary_large_image', 'name');
    setMeta('meta[name="twitter:title"]', 'twitter:title', article.title, 'name');
    setMeta('meta[name="twitter:description"]', 'twitter:description', article.metaDescription, 'name');
    setMeta('meta[name="twitter:image"]', 'twitter:image', article.thumbnail || '', 'name');

    const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (canonical) canonical.setAttribute('href', pageUrl);

    // JSON-LD Article
    const existingArticle = document.querySelector('script[data-schema="article"]');
    if (existingArticle) existingArticle.remove();
    const articleScript = document.createElement('script');
    articleScript.type = 'application/ld+json';
    articleScript.setAttribute('data-schema', 'article');
    articleScript.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": article.title,
      "description": article.metaDescription,
      "image": article.thumbnail || undefined,
      "datePublished": article.datePublished,
      "dateModified": article.dateModified,
      "author": { "@type": "Organization", "name": '${esc(siteConfig.siteName)}' },
      "publisher": { "@type": "Organization", "name": '${esc(siteConfig.siteName)}', "url": '${esc(siteUrl)}' },
      "url": pageUrl,
    });
    document.head.appendChild(articleScript);

    // JSON-LD BreadcrumbList
    const existingBreadcrumb = document.querySelector('script[data-schema="breadcrumb"]');
    if (existingBreadcrumb) existingBreadcrumb.remove();
    const breadcrumbScript = document.createElement('script');
    breadcrumbScript.type = 'application/ld+json';
    breadcrumbScript.setAttribute('data-schema', 'breadcrumb');
    breadcrumbScript.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": '${esc(siteUrl)}' },
        { "@type": "ListItem", "position": 2, "name": article.category, "item": catUrl },
        { "@type": "ListItem", "position": 3, "name": article.title, "item": pageUrl },
      ]
    });
    document.head.appendChild(breadcrumbScript);
  }, [article]);

  // Extract headings for TOC
  useEffect(() => {
    if (!article || !contentRef.current) return;
    const h2s = contentRef.current.querySelectorAll('h2');
    const extracted: { id: string; text: string }[] = [];
    h2s.forEach((h) => {
      const id = h.id || h.textContent?.replace(/[^a-z0-9]/gi, '-').toLowerCase() || '';
      if (!h.id) h.id = id;
      extracted.push({ id, text: h.textContent || '' });
    });
    setHeadings(extracted);
  }, [article]);

  // Track active heading
  useEffect(() => {
    if (headings.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveHeading(entry.target.id);
        });
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );
    headings.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [headings]);

  // Reading progress bar
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.min(100, Math.round((scrollTop / docHeight) * 100)) : 0;
      setReadProgress(progress);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!article) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#666", fontFamily: "monospace", marginBottom: "16px" }}>Article not found</p>
          <Link href="/"><span style={{ color: "${siteConfig.accentColor}", fontFamily: "monospace", fontSize: "12px", cursor: "pointer" }}>← BACK TO HOME</span></Link>
        </div>
      </div>
    );
  }

  const COLOR = {
    primary: "#f0f0f0",
    body: "#c8c8c8",
    secondary: "#aaaaaa",  // raised for WCAG AA
    tertiary: "#888888",   // raised from #777
    faint: "#666666",      // raised from #555
    accent: "${siteConfig.accentColor}",
    btnText: "${btnTextColor}",
    bg: "#0a0a0a",
    bgCard: "#0d0d0d",
    border: "#1e1e1e",
  };

  return (
    <div style={{ minHeight: "100vh", background: COLOR.bg, color: COLOR.body }}>
      {/* Reading progress bar — thin accent line at very top of viewport */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "2px", zIndex: 100, background: "transparent" }}>
        <div style={{ height: "100%", background: COLOR.accent, width: \`\${readProgress}%\`, transition: "width 0.1s linear" }} />
      </div>

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
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: sec.slug === article.categorySlug ? COLOR.accent : COLOR.tertiary, letterSpacing: "0.06em", cursor: "pointer" }}>
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

      {/* Article layout */}
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 clamp(24px, 5vw, 64px)", display: "flex", gap: "48px", alignItems: "flex-start" }}>
        {/* Main content */}
        <article style={{ flex: 1, minWidth: 0, padding: "48px 0 80px" }}>
          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontFamily: "'Space Mono', monospace", fontSize: "10px", color: COLOR.tertiary, marginBottom: "24px" }}>
            <Link href="/"><span style={{ color: COLOR.tertiary, cursor: "pointer" }}>HOME</span></Link>
            <span>→</span>
            <Link href={\`/\${article.categorySlug}\`}><span style={{ color: COLOR.tertiary, cursor: "pointer" }}>{article.category.toUpperCase()}</span></Link>
            <span>→</span>
            <span style={{ color: COLOR.secondary }}>{article.title.toUpperCase().slice(0, 40)}{article.title.length > 40 ? "..." : ""}</span>
          </div>

          {/* Category badge */}
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: COLOR.accent, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "16px" }}>
            {article.category}
          </div>

          {/* Title */}
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.6rem, 3.5vw, 2.2rem)", fontWeight: 700, color: COLOR.primary, lineHeight: 1.25, marginBottom: "20px" }}>
            {article.title}
          </h1>

          {/* Meta */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", fontFamily: "'Space Mono', monospace", fontSize: "10px", color: COLOR.tertiary, marginBottom: "32px", paddingBottom: "24px", borderBottom: \`1px solid \${COLOR.border}\`, flexWrap: "wrap" }}>
            <span>PUBLISHED {article.datePublished}</span>
            {article.dateModified !== article.datePublished && <span>UPDATED {article.dateModified}</span>}
            {categoryAllArticles.length > 1 && (
              <span style={{ marginLeft: "auto", color: COLOR.faint }}>
                {articleIndex} / {categoryAllArticles.length} IN {article.category.toUpperCase()}
              </span>
            )}
          </div>

          {/* Hero image */}
          {article.thumbnail && (
            <div style={{ marginBottom: "32px", borderRadius: "4px", overflow: "hidden", border: \`1px solid \${COLOR.border}\` }}>
              <img src={article.thumbnail} alt={article.altText} style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} />
            </div>
          )}

          {/* Content */}
          <div
            ref={contentRef}
            className="article-content"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content) }}
          />

          {/* Next article */}
          {nextArticle && (
            <div style={{ marginTop: "64px", paddingTop: "32px", borderTop: \`1px solid \${COLOR.border}\` }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: COLOR.tertiary, letterSpacing: "0.1em", marginBottom: "16px" }}>
                // NEXT IN {article.category.toUpperCase()}
              </div>
              <Link href={\`/articles/\${nextArticle.slug}\`}>
                <div style={{ border: \`1px solid \${COLOR.border}\`, borderLeft: \`3px solid \${COLOR.accent}\`, borderRadius: "4px", padding: "20px", cursor: "pointer", transition: "background 0.15s" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "#0f0f0f")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "transparent")}
                >
                  <h3 style={{ fontFamily: "Georgia, serif", fontSize: "16px", fontWeight: 700, color: COLOR.primary, marginBottom: "8px" }}>{nextArticle.title}</h3>
                  <p style={{ fontFamily: "Georgia, serif", fontSize: "13px", color: COLOR.secondary, lineHeight: 1.6, marginBottom: "12px" }}>{nextArticle.excerpt}</p>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: COLOR.accent, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    READ ARTICLE <ArrowRight size={10} />
                  </span>
                </div>
              </Link>
            </div>
          )}

          {/* FURTHER READING — cross-category articles */}
          {furtherReading.length > 0 && (
            <div style={{ marginTop: "48px", paddingTop: "32px", borderTop: \`1px solid \${COLOR.border}\` }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: COLOR.tertiary, letterSpacing: "0.1em", marginBottom: "20px" }}>
                // FURTHER READING
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                {furtherReading.map((fr) => (
                  <Link key={fr.slug} href={\`/articles/\${fr.slug}\`}>
                    <div
                      style={{ borderBottom: \`1px solid #111\`, padding: "16px 0", cursor: "pointer", transition: "padding-left 0.1s" }}
                      onMouseEnter={(e) => (e.currentTarget as HTMLDivElement).style.paddingLeft = "8px"}
                      onMouseLeave={(e) => (e.currentTarget as HTMLDivElement).style.paddingLeft = "0"}
                    >
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", color: COLOR.accent, letterSpacing: "0.08em", marginBottom: "4px" }}>
                        {fr.category.toUpperCase()}
                      </div>
                      <h3 style={{ fontFamily: "Georgia, serif", fontSize: "15px", fontWeight: 700, color: COLOR.primary, lineHeight: 1.3, marginBottom: "4px" }}>
                        {fr.title}
                      </h3>
                      <p style={{ fontFamily: "Georgia, serif", fontSize: "12px", color: COLOR.secondary, lineHeight: 1.5 }}>
                        {fr.excerpt}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </article>

        {/* TOC sidebar (desktop only) — shown via CSS class, hidden on mobile */}
        {headings.length > 2 && (
          <aside style={{ width: "220px", flexShrink: 0, position: "sticky", top: "80px", paddingTop: "48px" }} className="toc-sidebar">
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", color: COLOR.tertiary, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "12px" }}>
              // CONTENTS
            </div>
            <nav>
              {headings.map((h) => (
                <a
                  key={h.id}
                  href={\`#\${h.id}\`}
                  style={{
                    display: "block",
                    fontFamily: "Georgia, serif",
                    fontSize: "12px",
                    color: activeHeading === h.id ? COLOR.accent : COLOR.tertiary,
                    textDecoration: "none",
                    padding: "5px 0 5px 10px",
                    borderLeft: \`2px solid \${activeHeading === h.id ? COLOR.accent : COLOR.border}\`,
                    marginBottom: "2px",
                    transition: "color 0.15s, border-color 0.15s",
                    lineHeight: 1.4,
                  }}
                >
                  {h.text}
                </a>
              ))}
            </nav>
          </aside>
        )}
      </div>
    </div>
  );
}
`;
}
