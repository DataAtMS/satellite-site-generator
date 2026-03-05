// Design: Minimal Dark Terminal — DTC101 Clone
// Article page UX v2: sticky TOC sidebar, reading progress bar, next-in-category prompt
// Changes: #4 sticky TOC, #5 reading progress bar, #6 next-in-category at article end

import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useParams } from "wouter";
import { articles, getArticleBySlug, CATEGORIES } from "@/data/articles";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { Copy, Share2, ChevronRight, ChevronLeft, ArrowLeft, List } from "lucide-react";

// Extract H2 headings from markdown content for TOC
function extractHeadings(content: string): { id: string; text: string }[] {
  const lines = content.split("\n");
  const headings: { id: string; text: string }[] = [];
  for (const line of lines) {
    const match = line.match(/^## (.+)/);
    if (match) {
      const text = match[1].trim();
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
      headings.push({ id, text });
    }
  }
  return headings;
}

export default function ArticlePage() {
  const params = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const [copied, setCopied] = useState(false);
  const [readProgress, setReadProgress] = useState(0);
  const [activeHeading, setActiveHeading] = useState<string>("");
  const [tocOpen, setTocOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const article = getArticleBySlug(params.slug ?? "");

  // Find prev/next articles
  const currentIdx = articles.findIndex((a) => a.slug === params.slug);
  const prevArticle = currentIdx > 0 ? articles[currentIdx - 1] : null;
  const nextArticle = currentIdx < articles.length - 1 ? articles[currentIdx + 1] : null;

  // Next article in the same category
  const sameCategory = articles.filter(
    (a) => a.categorySlug === article?.categorySlug && a.slug !== article?.slug
  );
  const nextInCategory = sameCategory[0] ?? null;

  // Related articles (same category, excluding current)
  const related = sameCategory.slice(0, 3);

  // Other articles for "More Reading"
  const otherArticles = articles
    .filter((a) => a.slug !== article?.slug && !related.find((r) => r.slug === a.slug))
    .slice(0, 3);

  // TOC headings
  const headings = article ? extractHeadings(article.content) : [];

  const handleCopy = useCallback(() => {
    if (article) {
      navigator.clipboard.writeText(article.content).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }, [article]);

  const handleShare = useCallback(() => {
    if (navigator.share && article) {
      navigator.share({ title: article.title, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  }, [article]);

  // Reading progress bar
  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        setReadProgress(Math.min(100, (scrollTop / docHeight) * 100));
      }

      // Active heading detection
      if (contentRef.current) {
        const headingEls = contentRef.current.querySelectorAll("h2[id]");
        let current = "";
        headingEls.forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 120) {
            current = el.id;
          }
        });
        setActiveHeading(current);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [params.slug]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space" && nextArticle) {
        e.preventDefault();
        navigate(`/articles/${nextArticle.slug}`);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      if (e.code === "ArrowRight" && nextArticle) {
        navigate(`/articles/${nextArticle.slug}`);
        window.scrollTo({ top: 0 });
      }
      if (e.code === "ArrowLeft" && prevArticle) {
        navigate(`/articles/${prevArticle.slug}`);
        window.scrollTo({ top: 0 });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nextArticle, prevArticle, navigate]);

  // Scroll to top on slug change
  useEffect(() => {
    window.scrollTo({ top: 0 });
    setReadProgress(0);
    setActiveHeading("");
  }, [params.slug]);

  // Update document title + meta description
  useEffect(() => {
    if (article) {
      document.title = `${article.title} — Ecommerce Heatmaps`;

      let metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', article.metaDescription);

      let ogDesc = document.querySelector('meta[property="og:description"]') as HTMLMetaElement | null;
      if (!ogDesc) {
        ogDesc = document.createElement('meta');
        ogDesc.setAttribute('property', 'og:description');
        document.head.appendChild(ogDesc);
      }
      ogDesc.setAttribute('content', article.metaDescription);

      let ogTitle = document.querySelector('meta[property="og:title"]') as HTMLMetaElement | null;
      if (!ogTitle) {
        ogTitle = document.createElement('meta');
        ogTitle.setAttribute('property', 'og:title');
        document.head.appendChild(ogTitle);
      }
      ogTitle.setAttribute('content', `${article.title} — Ecommerce Heatmaps`);

      let ogImage = document.querySelector('meta[property="og:image"]') as HTMLMetaElement | null;
      if (!ogImage) {
        ogImage = document.createElement('meta');
        ogImage.setAttribute('property', 'og:image');
        document.head.appendChild(ogImage);
      }
      ogImage.setAttribute('content', article.thumbnail);

      // og:url
      let ogUrl = document.querySelector('meta[property="og:url"]') as HTMLMetaElement | null;
      if (!ogUrl) {
        ogUrl = document.createElement('meta');
        ogUrl.setAttribute('property', 'og:url');
        document.head.appendChild(ogUrl);
      }
      ogUrl.setAttribute('content', `https://ecommerceheatmaps.com/articles/${article.slug}`);

      // og:type
      let ogType = document.querySelector('meta[property="og:type"]') as HTMLMetaElement | null;
      if (!ogType) {
        ogType = document.createElement('meta');
        ogType.setAttribute('property', 'og:type');
        document.head.appendChild(ogType);
      }
      ogType.setAttribute('content', 'article');

      // og:site_name
      let ogSite = document.querySelector('meta[property="og:site_name"]') as HTMLMetaElement | null;
      if (!ogSite) {
        ogSite = document.createElement('meta');
        ogSite.setAttribute('property', 'og:site_name');
        document.head.appendChild(ogSite);
      }
      ogSite.setAttribute('content', 'Ecommerce Heatmaps');

      // Twitter Card tags
      const twitterTags: Record<string, string> = {
        'twitter:card': 'summary_large_image',
        'twitter:title': `${article.title} — Ecommerce Heatmaps`,
        'twitter:description': article.metaDescription,
        'twitter:image': article.thumbnail,
        'twitter:site': '@ecomheatmaps',
      };
      Object.entries(twitterTags).forEach(([name, value]) => {
        let tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
        if (!tag) {
          tag = document.createElement('meta');
          tag.setAttribute('name', name);
          document.head.appendChild(tag);
        }
        tag.setAttribute('content', value);
      });

      let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
      }
      canonical.setAttribute('href', `https://ecommerceheatmaps.com/articles/${article.slug}`);

      // JSON-LD: Article schema
      let ldArticle = document.getElementById('ld-article') as HTMLScriptElement | null;
      if (!ldArticle) {
        ldArticle = document.createElement('script');
        ldArticle.id = 'ld-article';
        ldArticle.type = 'application/ld+json';
        document.head.appendChild(ldArticle);
      }
      ldArticle.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: article.title,
        description: article.metaDescription,
        image: article.thumbnail,
        datePublished: article.datePublished,
        dateModified: article.dateModified,
        author: {
          '@type': 'Organization',
          name: 'Ecommerce Heatmaps',
          url: 'https://ecommerceheatmaps.com',
        },
        publisher: {
          '@type': 'Organization',
          name: 'Ecommerce Heatmaps',
          url: 'https://ecommerceheatmaps.com',
          logo: {
            '@type': 'ImageObject',
            url: 'https://ecommerceheatmaps.com/favicon.ico',
          },
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': `https://ecommerceheatmaps.com/articles/${article.slug}`,
        },
        url: `https://ecommerceheatmaps.com/articles/${article.slug}`,
        articleSection: article.category,
        inLanguage: 'en-US',
      });

      // JSON-LD: BreadcrumbList schema
      let ldBreadcrumb = document.getElementById('ld-breadcrumb') as HTMLScriptElement | null;
      if (!ldBreadcrumb) {
        ldBreadcrumb = document.createElement('script');
        ldBreadcrumb.id = 'ld-breadcrumb';
        ldBreadcrumb.type = 'application/ld+json';
        document.head.appendChild(ldBreadcrumb);
      }
      ldBreadcrumb.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: 'https://ecommerceheatmaps.com/',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: article.category,
            item: `https://ecommerceheatmaps.com/${article.categorySlug}`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: article.title,
            item: `https://ecommerceheatmaps.com/articles/${article.slug}`,
          },
        ],
      });
    }
  }, [article]);

  if (!article) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e8e8e8", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: "#ff0066", marginBottom: "16px" }}>
            404 — ARTICLE NOT FOUND
          </div>
          <Link href="/">
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "12px", color: "#666", cursor: "pointer", textDecoration: "underline" }}>
              ← Back to all articles
            </span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e8e8e8" }}>
      {/* ── Reading progress bar ── */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          height: "2px",
          width: `${readProgress}%`,
          background: "#ff0066",
          zIndex: 100,
          transition: "width 0.1s linear",
          pointerEvents: "none",
        }}
      />

      {/* ── Top nav bar ── */}
      <header
        style={{
          borderBottom: "1px solid #1a1a1a",
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "#0a0a0a",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 20px",
            borderBottom: "1px solid #1a1a1a",
          }}
        >
          <Link href="/">
            <span
              style={{
                fontFamily: "'Space Mono', monospace",
                fontWeight: 700,
                fontSize: "13px",
                color: "#ff0066",
                letterSpacing: "0.05em",
                cursor: "pointer",
              }}
            >
              ECOMMERCE HEATMAPS
            </span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* Mobile TOC toggle */}
            {headings.length > 0 && (
              <button
                className="mobile-only"
                onClick={() => setTocOpen((v) => !v)}
                style={{
                  background: "none",
                  border: "none",
                  color: tocOpen ? "#ff0066" : "#555",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "10px",
                }}
              >
                <List size={13} />
                <span>TOC</span>
              </button>
            )}
            <span className="hidden-mobile" style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: "#333" }}>
              {currentIdx + 1}/{articles.length}
            </span>
            <span className="hidden-mobile" style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: "#333" }}>
              SPACE / NEXT
            </span>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: "#333" }}>
              {Math.round(readProgress)}%
            </span>
          </div>
        </div>

        {/* Category filter row — desktop only */}
        <div
          className="hidden-mobile"
          style={{
            overflowX: "auto",
            padding: "8px 20px",
            display: "flex",
            gap: "6px",
            scrollbarWidth: "none",
          }}
        >
          {CATEGORIES.map((cat) => (
            <Link key={cat.slug} href={cat.slug === "all" ? "/" : `/${cat.slug}`}>
              <button
                className={`category-pill${article.categorySlug === cat.slug ? " active" : ""}`}
              >
                {cat.label.toUpperCase()}
              </button>
            </Link>
          ))}
        </div>

        {/* Mobile TOC dropdown */}
        {tocOpen && headings.length > 0 && (
          <div
            className="mobile-only"
            style={{
              borderTop: "1px solid #1a1a1a",
              background: "#0d0d0d",
              padding: "12px 0",
              maxHeight: "50vh",
              overflowY: "auto",
            }}
          >
            {headings.map((h) => (
              <a
                key={h.id}
                href={`#${h.id}`}
                onClick={() => setTocOpen(false)}
                style={{
                  display: "block",
                  padding: "8px 20px",
                  fontFamily: "Georgia, serif",
                  fontSize: "13px",
                  color: activeHeading === h.id ? "#ff0066" : "#666",
                  textDecoration: "none",
                  borderLeft: activeHeading === h.id ? "2px solid #ff0066" : "2px solid transparent",
                  transition: "color 0.1s",
                }}
              >
                {h.text}
              </a>
            ))}
          </div>
        )}
      </header>

      {/* ── Page layout: article + sticky TOC sidebar ── */}
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "0 clamp(16px, 4vw, 24px)",
          display: "flex",
          gap: "48px",
          alignItems: "flex-start",
        }}
      >
        {/* ── Main article column ── */}
        <main style={{ flex: 1, minWidth: 0, padding: "48px 0 80px" }}>
          {/* Breadcrumb */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "24px",
            }}
          >
            <Link href="/">
              <span
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "10px",
                  color: "#444",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <ArrowLeft size={10} /> ALL ARTICLES
              </span>
            </Link>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: "#2a2a2a" }}>
              /
            </span>
            <span
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "10px",
                color: "#ff0066",
                letterSpacing: "0.08em",
              }}
            >
              {article.category.toUpperCase()}
            </span>
          </div>

          {/* Hero image */}
          <div
            style={{
              width: "100%",
              borderRadius: "6px",
              overflow: "hidden",
              marginBottom: "40px",
              border: "1px solid #1a1a1a",
            }}
          >
            <img
              src={article.thumbnail}
              alt={article.altText}
              style={{ width: "100%", display: "block", aspectRatio: "16/9", objectFit: "cover" }}
              loading="eager"
            />
          </div>

          {/* Article content */}
          <div ref={contentRef}>
            <MarkdownRenderer content={article.content} />
          </div>

          {/* Meta line */}
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "10px",
              color: "#333",
              marginTop: "32px",
              marginBottom: "20px",
              borderTop: "1px solid #1a1a1a",
              paddingTop: "16px",
            }}
          >
            Article {currentIdx + 1} of {articles.length}.{" "}
            <a
              href="mailto:hello@ecommerceheatmaps.com"
              style={{ color: "#ff0066", textDecoration: "underline" }}
            >
              Submit a correction
            </a>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            {nextArticle && (
              <Link href={`/articles/${nextArticle.slug}`}>
                <button className="action-btn primary">
                  NEXT ARTICLE <ChevronRight size={12} />
                </button>
              </Link>
            )}
            {prevArticle && (
              <Link href={`/articles/${prevArticle.slug}`}>
                <button className="action-btn">
                  <ChevronLeft size={12} /> PREV
                </button>
              </Link>
            )}
            <button className="action-btn" onClick={handleShare}>
              <Share2 size={11} /> SHARE
            </button>
            <button className="action-btn" onClick={handleCopy}>
              <Copy size={11} /> {copied ? "COPIED!" : "COPY"}
            </button>
          </div>

          {/* ── Next in category prompt ── */}
          {nextInCategory && (
            <div
              style={{
                marginTop: "48px",
                border: "1px solid #1f1f1f",
                borderLeft: "3px solid #ff0066",
                borderRadius: "4px",
                padding: "20px 24px",
                background: "#0d0d0d",
              }}
            >
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "10px",
                  color: "#ff0066",
                  letterSpacing: "0.08em",
                  marginBottom: "10px",
                }}
              >
                NEXT IN {article.category.toUpperCase()} →
              </div>
              <Link href={`/articles/${nextInCategory.slug}`}>
                <div style={{ cursor: "pointer" }}>
                  <div
                    style={{
                      fontFamily: "Georgia, serif",
                      fontSize: "17px",
                      fontWeight: 700,
                      color: "#e8e8e8",
                      lineHeight: 1.35,
                      marginBottom: "8px",
                      textDecoration: "underline",
                      textUnderlineOffset: "3px",
                      textDecorationColor: "#333",
                    }}
                  >
                    {nextInCategory.title}
                  </div>
                  <p
                    style={{
                      fontFamily: "Georgia, serif",
                      fontSize: "13px",
                      color: "#666",
                      lineHeight: 1.6,
                      marginBottom: "12px",
                    }}
                  >
                    {nextInCategory.excerpt}
                  </p>
                  <span
                    style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "10px",
                      color: "#ff0066",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    READ ARTICLE <ChevronRight size={10} />
                  </span>
                </div>
              </Link>
            </div>
          )}

          {/* Related articles in same category */}
          {related.length > 0 && (
            <div
              style={{
                marginTop: "40px",
                borderTop: "1px solid #1a1a1a",
                paddingTop: "24px",
              }}
            >
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "10px",
                  color: "#ff0066",
                  letterSpacing: "0.08em",
                  marginBottom: "16px",
                }}
              >
                MORE IN {article.category.toUpperCase()}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {related.map((a) => (
                  <Link key={a.id} href={`/articles/${a.slug}`}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", cursor: "pointer" }}>
                      <span style={{ color: "#ff0066", fontSize: "10px", paddingTop: "3px" }}>→</span>
                      <div
                        style={{
                          fontFamily: "Georgia, serif",
                          fontSize: "14px",
                          color: "#888",
                          textDecoration: "underline",
                          textUnderlineOffset: "3px",
                          lineHeight: 1.4,
                        }}
                      >
                        {a.title}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Other articles */}
          {otherArticles.length > 0 && (
            <div
              style={{
                marginTop: "32px",
                borderTop: "1px solid #1a1a1a",
                paddingTop: "24px",
              }}
            >
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "10px",
                  color: "#444",
                  letterSpacing: "0.08em",
                  marginBottom: "16px",
                }}
              >
                FURTHER READING
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {otherArticles.map((a) => (
                  <Link key={a.id} href={`/articles/${a.slug}`}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", cursor: "pointer" }}>
                      <span style={{ color: "#444", fontSize: "10px", paddingTop: "3px" }}>→</span>
                      <div>
                        <div
                          style={{
                            fontFamily: "'Space Mono', monospace",
                            fontSize: "10px",
                            color: "#ff0066",
                            marginBottom: "2px",
                          }}
                        >
                          {a.category.toUpperCase()}
                        </div>
                        <div
                          style={{
                            fontFamily: "Georgia, serif",
                            fontSize: "14px",
                            color: "#666",
                            textDecoration: "underline",
                            textUnderlineOffset: "3px",
                            lineHeight: 1.4,
                          }}
                        >
                          {a.title}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Back to home */}
          <div style={{ marginTop: "48px", paddingTop: "24px", borderTop: "1px solid #1a1a1a" }}>
            <Link href="/">
              <span
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "11px",
                  color: "#444",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <ArrowLeft size={11} /> BACK TO ALL ARTICLES
              </span>
            </Link>
          </div>
        </main>

        {/* ── Sticky TOC sidebar (desktop only) ── */}
        {headings.length > 0 && (
          <aside
            className="hidden-mobile"
            style={{
              width: "220px",
              flexShrink: 0,
              position: "sticky",
              top: "80px",
              maxHeight: "calc(100vh - 100px)",
              overflowY: "auto",
              paddingTop: "48px",
              paddingBottom: "24px",
              scrollbarWidth: "none",
            }}
          >
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "9px",
                color: "#333",
                letterSpacing: "0.1em",
                marginBottom: "16px",
                textTransform: "uppercase",
              }}
            >
              IN THIS ARTICLE
            </div>
            <nav>
              {headings.map((h) => (
                <a
                  key={h.id}
                  href={`#${h.id}`}
                  style={{
                    display: "block",
                    fontFamily: "Georgia, serif",
                    fontSize: "12px",
                    lineHeight: 1.5,
                    color: activeHeading === h.id ? "#ff0066" : "#444",
                    textDecoration: "none",
                    padding: "5px 0 5px 12px",
                    borderLeft: activeHeading === h.id ? "2px solid #ff0066" : "2px solid #1a1a1a",
                    marginBottom: "2px",
                    transition: "color 0.15s, border-color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (activeHeading !== h.id) {
                      (e.currentTarget as HTMLAnchorElement).style.color = "#888";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeHeading !== h.id) {
                      (e.currentTarget as HTMLAnchorElement).style.color = "#444";
                    }
                  }}
                >
                  {h.text}
                </a>
              ))}
            </nav>

            {/* Progress indicator in sidebar */}
            <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #1a1a1a" }}>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "9px",
                  color: "#333",
                  letterSpacing: "0.1em",
                  marginBottom: "8px",
                }}
              >
                PROGRESS
              </div>
              <div
                style={{
                  height: "2px",
                  background: "#1a1a1a",
                  borderRadius: "1px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${readProgress}%`,
                    background: "#ff0066",
                    transition: "width 0.1s linear",
                  }}
                />
              </div>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "9px",
                  color: "#333",
                  marginTop: "6px",
                }}
              >
                {Math.round(readProgress)}% read
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid #1a1a1a",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "10px",
            color: "#2a2a2a",
            letterSpacing: "0.05em",
          }}
        >
          © {new Date().getFullYear()} ECOMMERCEHEATMAPS.COM — ALL ARTICLES WRITTEN BY HUMAN EXPERTS
        </p>
      </footer>
    </div>
  );
}
