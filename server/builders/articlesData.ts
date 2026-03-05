interface SiteConfig {
  domain: string;
  siteName: string;
  categories: { label: string; slug: string }[];
}

interface WrittenArticle {
  topicId: string;
  slug: string;
  title: string;
  categorySlug: string;
  categoryLabel: string;
  content: string;
  metaDescription: string;
  excerpt: string;
  altText?: string;
  thumbnail?: string;
  datePublished: string;
  dateModified: string;
}

function escapeBacktick(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$");
}

function escapeString(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

export function buildArticlesTs(
  siteConfig: SiteConfig,
  articles: WrittenArticle[],
  accentColor?: string
): string {
  // Strip # from accent color for placehold.co URL
  const accent = (accentColor || 'ff0066').replace('#', '');
  const categoriesCode = [
    `  { label: "All", slug: "all" }`,
    ...siteConfig.categories.map((c) => `  { label: "${c.label}", slug: "${c.slug}" }`),
  ].join(",\n");

  const articlesCode = articles
    .map((article, idx) => {
      const content = escapeBacktick(article.content);
      // Placeholder thumbnail — swap for real images after deploy
      // Uses accent color as background with white text for visibility
      const thumbTitle = encodeURIComponent(
        article.title.slice(0, 45).replace(/[^a-zA-Z0-9 ]/g, '')
      );
      const thumbnail = article.thumbnail ||
        `https://placehold.co/1200x630/${accent}/ffffff?text=${thumbTitle}&font=montserrat`;
      return `  {
    id: ${idx + 1},
    slug: "${escapeString(article.slug)}",
    title: "${escapeString(article.title)}",
    category: "${escapeString(article.categoryLabel)}",
    categorySlug: "${escapeString(article.categorySlug)}",
    metaDescription: "${escapeString(article.metaDescription)}",
    excerpt: "${escapeString(article.excerpt)}",
    thumbnail: "${thumbnail}",
    altText: "${escapeString(article.altText || article.title)}",
    datePublished: "${article.datePublished}",
    dateModified: "${article.dateModified}",
    content: \`${content}\`,
  }`;
    })
    .join(",\n");

  return `// =============================================================================
// ARTICLES DATA — ${siteConfig.siteName}
// =============================================================================
//
// HOW TO ADD A NEW ARTICLE:
//   1. Add a new object to the articles array below.
//   2. Required fields: id (next integer), slug (kebab-case), title, category,
//      categorySlug (must match a slug in CATEGORIES), metaDescription (150-160 chars),
//      excerpt (1-2 sentences), thumbnail (CDN URL or ""), altText, datePublished (YYYY-MM-DD),
//      dateModified (YYYY-MM-DD), content (markdown).
//
// HOW TO UPDATE AN EXISTING ARTICLE:
//   1. Find the article by its slug.
//   2. Edit the content field.
//   3. Update dateModified to today's date (YYYY-MM-DD format).
//   4. Update metaDescription if the article angle changed.
//
// HOW TO ADD A NEW CATEGORY:
//   1. Add a new object to the CATEGORIES array: { label: "Display Name", slug: "kebab-slug" }
//   2. Use the new slug as categorySlug on articles in that category.
//   3. The homepage topic sections and nav links update automatically.
//
// =============================================================================

export interface Article {
  id: number;
  slug: string;
  title: string;
  category: string;
  categorySlug: string;
  metaDescription: string;
  excerpt: string;
  thumbnail: string;
  altText: string;
  /** ISO date string YYYY-MM-DD — set once on first publish, never change */
  datePublished: string;
  /** ISO date string YYYY-MM-DD — update every time the article content changes */
  dateModified: string;
  content: string;
}

export const CATEGORIES = [
${categoriesCode}
];

export const articles: Article[] = [
${articlesCode}
];

export function getArticleBySlug(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug);
}

export function getArticlesByCategory(categorySlug: string): Article[] {
  if (categorySlug === "all") return articles;
  return articles.filter((a) => a.categorySlug === categorySlug);
}
`;
}
