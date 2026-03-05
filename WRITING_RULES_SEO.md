# SEO Rules — Satellite Site Generator
## Extracted from ecommerceheatmaps.com build + standard practices

---

## 1. Page Title Formats

| Page Type | Title Format | Example |
|-----------|-------------|---------|
| Homepage | `{Site Name}: {Hero Tagline}` | `Ecommerce Heatmaps: See What Visitors Do` |
| Category page | `{Category H1} \| {Site Name}` | `Scroll Maps for Ecommerce \| Ecommerce Heatmaps` |
| Article page | `{Article Title} — {Site Name}` | `How Scroll Maps Reveal the Fold Problem — Ecommerce Heatmaps` |

- Titles must be 50–60 characters. Never exceed 60.
- Include the primary keyword in the title, ideally near the front.
- Never use pipes and dashes interchangeably — homepage uses colon, categories use pipe, articles use em-dash (rendered as `—`).

---

## 2. Meta Description Rules

- Length: 150–160 characters. Hard limit. Never go over 160.
- Must include the primary keyword naturally in the first sentence.
- Active voice. No em dashes. No banned words.
- End with a benefit statement or implicit CTA ("Here's how." / "Learn what the data shows.").
- Each page must have a unique meta description — no duplicates across the site.
- The article `metaDescription` field is used for: `<meta name="description">`, `og:description`, `twitter:description`, and the Article JSON-LD `description` field.

---

## 3. URL / Slug Rules

- Format: `kebab-case`, all lowercase, no special characters.
- Article URLs: `/articles/{slug}` — e.g. `/articles/scroll-maps-fold-problem`
- Category URLs: `/{category-slug}` — e.g. `/scroll-maps`
- Slugs MUST include an exact or partial match of the primary keyword.
- **Maximum 5 words. Preferred: 4 words.** No stop words (a, the, for, of, in, to, with, by, from) unless they are essential to meaning.
- The slug is derived from the article title by the system — the AI does not set slugs. However, the AI should write titles that produce clean 4-5 word slugs when stop words are removed.
- Good slug examples: `scroll-map-analysis`, `click-map-product-pages`, `mobile-heatmap-setup`, `ab-test-sample-size`
- Bad slug examples: `how-to-use-scroll-maps-to-understand-user-behavior-on-your-ecommerce-store` (too long), `scroll-maps` (too short, not specific enough)
- Never change a slug after publish — it breaks inbound links and loses PageRank.

---

## 4. Canonical Tags

Every page must have a canonical tag pointing to its own absolute URL.

```html
<!-- Homepage -->
<link rel="canonical" href="https://yourdomain.com/" />

<!-- Category page -->
<link rel="canonical" href="https://yourdomain.com/scroll-maps" />

<!-- Article page -->
<link rel="canonical" href="https://yourdomain.com/articles/your-slug" />
```

The canonical is set dynamically in each page component's `useEffect` via `document.querySelector('link[rel="canonical"]')`.

---

## 5. Open Graph Tags (Required on Every Page)

```html
<meta property="og:title" content="..." />
<meta property="og:description" content="..." />
<meta property="og:image" content="https://..." />   <!-- absolute CDN URL -->
<meta property="og:url" content="https://..." />     <!-- canonical URL -->
<meta property="og:type" content="article" />        <!-- "website" on homepage/category -->
<meta property="og:site_name" content="{Site Name}" />
```

- `og:image` must be an absolute URL. Minimum 1200x630px recommended.
- `og:type` is `article` on article pages, `website` on homepage and category pages.
- All OG tags are set dynamically in each page's `useEffect`.

---

## 6. Twitter Card Tags (Required on Every Page)

```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="..." />
<meta name="twitter:description" content="..." />
<meta name="twitter:image" content="https://..." />
<meta name="twitter:site" content="@{twitterHandle}" />
```

Always use `summary_large_image` card type. The image must be the same as `og:image`.

---

## 7. JSON-LD Structured Data

### Homepage — WebSite schema (in `index.html`, static)

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "{Site Name}",
  "url": "https://{domain}",
  "description": "{hero subtitle}",
  "inLanguage": "en-US",
  "publisher": {
    "@type": "Organization",
    "name": "{Site Name}",
    "url": "https://{domain}"
  },
  "potentialAction": {
    "@type": "ReadAction",
    "target": "https://{domain}/"
  }
}
```

### Category Pages — CollectionPage + BreadcrumbList (dynamic, in `useEffect`)

```json
{
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "{Category H1}",
  "description": "{category metaDescription}",
  "url": "https://{domain}/{category-slug}",
  "mainEntity": {
    "@type": "ItemList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "url": "...", "name": "..." }
    ]
  }
}
```

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://{domain}/" },
    { "@type": "ListItem", "position": 2, "name": "{Category}", "item": "https://{domain}/{slug}" }
  ]
}
```

### Article Pages — Article + BreadcrumbList (dynamic, in `useEffect`)

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "{article.title}",
  "description": "{article.metaDescription}",
  "image": "{article.thumbnail}",
  "datePublished": "{article.datePublished}",
  "dateModified": "{article.dateModified}",
  "author": {
    "@type": "Organization",
    "name": "{Site Name}",
    "url": "https://{domain}"
  },
  "publisher": {
    "@type": "Organization",
    "name": "{Site Name}",
    "url": "https://{domain}",
    "logo": { "@type": "ImageObject", "url": "https://{domain}/favicon.ico" }
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://{domain}/articles/{slug}"
  },
  "url": "https://{domain}/articles/{slug}",
  "articleSection": "{article.category}",
  "inLanguage": "en-US"
}
```

BreadcrumbList for articles has 3 items: Home → Category → Article.

---

## 8. robots.txt Rules

Allow all crawlers, including AI/LLM agents. Always include:

```
User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: DuckDuckBot
Allow: /

Sitemap: https://{domain}/sitemap.xml
```

Never use `Disallow` on any path. The goal is maximum crawlability.

---

## 9. XML Sitemap Rules

File: `/sitemap.xml` (static file in `client/public/`)

Priority values:
- Homepage: `1.0`, `changefreq: weekly`
- Category pages: `0.9`, `changefreq: weekly`
- Article pages: `0.8`, `changefreq: monthly`

Include `<lastmod>` on homepage and all article pages (use `dateModified` from article data).
Category pages do not need `<lastmod>`.

---

## 10. Article Data Fields (Required)

Every article in `articles.ts` must have all of these fields:

| Field | Type | Rules |
|-------|------|-------|
| `id` | number | Sequential integer, never reuse |
| `slug` | string | kebab-case, includes primary keyword, max 6 words |
| `title` | string | 50–60 chars, includes primary keyword |
| `category` | string | Display name, matches a CATEGORIES entry |
| `categorySlug` | string | Must match a slug in CATEGORIES exactly |
| `metaDescription` | string | 150–160 chars, unique, active voice |
| `excerpt` | string | 1–2 sentences, used on listing pages |
| `thumbnail` | string | Absolute CDN URL, 1200x630px |
| `altText` | string | Descriptive alt text for the thumbnail image |
| `datePublished` | string | `YYYY-MM-DD` format, set once, never change |
| `dateModified` | string | `YYYY-MM-DD` format, update on edits |
| `content` | string | Markdown, starts with `# {title}` as H1 |

---

## 11. Article Content Structure (Markdown)

```markdown
# {Article Title}                          ← H1 (matches title field exactly)

{Empathetic opening — 2 sentences max}

{Transition sentence — "Here is why." / "Let's break it down."}

## {H2 Section 1}                          ← H2 headings feed the TOC sidebar

{Body paragraph}

| Column A | Column B | Column C |       ← At least one coded table per article
|----------|----------|----------|
| Data     | Data     | Data     |

## {H2 Section 2}

{Body paragraph with [internal link](/articles/related-slug) to another article}

## {H2 Section 3}

{Body paragraph with [outbound link](https://reputable-source.com) to cited source}

## {Final H2 — practical takeaway or summary}

{Closing paragraph with partner CTA: "If you want a tool built for this, [Partner Name]({partner-url}) is worth a look."}
```

---

## 12. Internal Linking Rules

- Every article must link to at least 2 other articles on the same site.
- Links must be contextual — placed where they are genuinely useful to the reader.
- Use descriptive anchor text that includes keywords (never "click here" or "read more").
- Link format: `[anchor text](/articles/{slug})` — relative URLs, not absolute.
- Category pages are also valid link targets: `[anchor text](/{category-slug})`.
- Do not link to the same article more than once per article.

---

## 13. Outbound Link Rules

- Every article must include at least 2 outbound links to reputable external sources.
- Acceptable sources: government sites (.gov), standards bodies, recognized industry publications, tool vendors with authoritative content.
- Format: `[anchor text](https://full-url.com)` — always absolute URLs.
- Add `target="_blank" rel="noopener noreferrer"` when rendered in HTML (handled by MarkdownRenderer).
- Record each source as: Title, Publisher, Publication Date, URL (for citation tracking).
- The partner link (affiliate/sponsor) counts as one outbound link but does not replace editorial outbound links.

---

## 14. Heading Hierarchy Rules

- One `#` H1 per article — always the article title, always the first line of content.
- Use `##` H2 for all major sections — these populate the TOC sidebar.
- Use `###` H3 sparingly for sub-points within an H2 section.
- Never skip levels (no H1 → H3 without an H2 in between).
- H2 headings should be descriptive and include secondary keywords where natural.

---

## 15. Table Requirements

- Every article must contain at least one HTML-renderable markdown table.
- Tables must have a header row and at least 3 data rows.
- Tables should present comparative or quantitative data — not just lists.
- Good table subjects: tool comparisons, metric benchmarks, before/after data, feature matrices.

---

## 16. Category Page SEO

Each category page needs unique:
- `h1` — descriptive, includes category keyword + "for Ecommerce" or similar qualifier
- `metaDescription` — 150–160 chars, unique, describes the collection
- `intro` — 2–3 sentence paragraph explaining what this category covers and why it matters

These are stored in the `CATEGORY_META` record in `CategoryPage.tsx` (or equivalent builder output).

---

## 17. Homepage SEO

- `document.title` format: `{Site Name}: {Hero Tagline}`
- Meta description: 150–160 chars, includes 2–3 primary keywords, describes the site's purpose
- OG image: use the thumbnail of the first/featured article
- JSON-LD: WebSite schema (static in `index.html`)
- Canonical: homepage absolute URL with trailing slash

---

## 18. `<meta name="robots">` Tag

Always include in `index.html`:
```html
<meta name="robots" content="index, follow" />
```

Never use `noindex` or `nofollow` on any page of a satellite site.

---

## 19. Date Handling

- All dates in `YYYY-MM-DD` format.
- `datePublished`: set once when the article is first generated. Never change it.
- `dateModified`: same as `datePublished` on first publish. Update if content is edited.
- Use realistic staggered dates across articles (not all the same date) — spread over 2–4 weeks.
- Dates should be in the past (not future-dated).

---

## 20. `<html lang>` and `inLanguage`

- `<html lang="en">` in `index.html`
- `"inLanguage": "en-US"` in all JSON-LD schemas

---

## 21. Keyword Density

- Primary keyword: appears in title, meta description, H1, first paragraph, at least 2 H2s, and naturally throughout the body.
- Do not stuff. Natural prose that reads well to a human will have appropriate density.
- Secondary keywords: appear in H2 headings and body text where contextually relevant.
- The partner tool name should appear in the article body at least once (in the closing CTA section).
