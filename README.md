# Satellite Site Generator

An internal tool that generates complete, SEO-optimized React/Vite satellite sites in the style of [ecommerceheatmaps.com](https://ecommerceheatmaps.com).

## What It Does

The generator takes your site configuration, topic ideas, and article content, then outputs a **ready-to-deploy ZIP** containing a full React + Vite + TypeScript project with:

- Homepage with hero, featured article, and topic sections
- Category pages with full SEO (meta tags, JSON-LD, OG)
- Article pages with markdown rendering, breadcrumbs, related articles
- XML sitemap at `/sitemap.xml`
- `robots.txt` (allows all bots including GPTBot)
- JSON-LD schemas (Article, CollectionPage, BreadcrumbList, WebSite)
- OG + Twitter Card meta tags on all pages
- Mobile-responsive hamburger navigation
- Internal cross-linking between articles
- Canonical URLs on all pages
- SEO manifest JSON for easy post-generation editing

## 5-Step Wizard

1. **Site Config** — Domain, site name, tagline, accent color, partner link, categories
2. **Topics** — Claude generates topic ideas per category; you can edit/add/remove
3. **Articles** — Paste in your article content (markdown) for each topic
4. **SEO** — Review and edit all meta titles, descriptions, slugs, dates, and category SEO
5. **Generate** — One click produces the ZIP with all source files

## Running Locally

```bash
# Prerequisites: Node.js 18+, npm

npm install

# Set your Anthropic API key
export ANTHROPIC_API_KEY=sk-ant-...

npm run dev
# Opens at http://localhost:5173
# API server runs at http://localhost:3000
```

## Project Structure

```
site-generator/
├── client/                    # Generator UI (React + Vite)
│   └── src/
│       ├── pages/             # Step1Config, Step2Topics, Step3Articles, Step4Seo, Step5Generate
│       ├── components/        # Header, StepIndicator
│       └── lib/types.ts       # Shared TypeScript types
├── server/                    # Express API
│   ├── index.ts               # Server entry point (port 3000)
│   ├── routes/
│   │   ├── generateTopics.ts  # POST /api/generate-topics (Claude)
│   │   └── generateSite.ts    # POST /api/generate-site (ZIP assembly)
│   └── builders/              # One builder per output file
│       ├── appBuilder.ts
│       ├── homeBuilder.ts
│       ├── categoryPageBuilder.ts
│       ├── articlePageBuilder.ts
│       ├── articlesData.ts
│       ├── sitemapBuilder.ts
│       └── ...
└── template/                  # Reference template (ecommerceheatmaps.com)
```

## Output ZIP Structure

```
your-domain-site.zip
├── package.json               # React + Vite + wouter + lucide-react
├── vite.config.ts
├── tsconfig.json
├── client/
│   ├── index.html             # With Google Fonts (Space Mono + Georgia)
│   └── src/
│       ├── main.tsx
│       ├── index.css          # Dark terminal theme
│       ├── App.tsx            # Routes for all pages
│       ├── data/articles.ts   # All article data + CATEGORIES
│       └── pages/
│           ├── Home.tsx
│           ├── CategoryPage.tsx
│           ├── ArticlePage.tsx
│           └── Sitemap.tsx
├── seo-manifest.json          # All SEO metadata in one editable file
└── README.md
```

## Deploying the Generated Site

```bash
# After extracting the ZIP:
npm install
npm run dev        # Preview locally
npm run build      # Build for production (outputs to dist/)

# Deploy dist/ to Vercel, Netlify, or any static host
```
