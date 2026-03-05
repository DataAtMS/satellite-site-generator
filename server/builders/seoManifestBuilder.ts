interface SiteConfig {
  domain: string;
  siteName: string;
  tagline: string;
  heroSubtitle: string;
  categories: { label: string; slug: string }[];
}

interface WrittenArticle {
  slug: string;
  title: string;
  metaDescription: string;
  categorySlug: string;
  categoryLabel: string;
  datePublished: string;
  dateModified: string;
}

export function buildSeoManifestJson(siteConfig: SiteConfig, articles: WrittenArticle[]): string {
  const siteUrl = `https://${siteConfig.domain}`;
  const namePrefix = siteConfig.siteName + ':';
  const cleanTagline = siteConfig.tagline.startsWith(namePrefix)
    ? siteConfig.tagline.slice(namePrefix.length).trim()
    : siteConfig.tagline;
  const manifest = {
    siteTitle: `${siteConfig.siteName}: ${cleanTagline}`,
    siteDescription: siteConfig.heroSubtitle,
    siteUrl,
    generatedAt: new Date().toISOString(),
    articles: articles.map((a) => ({
      slug: a.slug,
      title: a.title,
      metaDescription: a.metaDescription,
      categorySlug: a.categorySlug,
      categoryLabel: a.categoryLabel,
      datePublished: a.datePublished,
      dateModified: a.dateModified,
      url: `${siteUrl}/articles/${a.slug}`,
    })),
    categories: siteConfig.categories.map((c) => ({
      slug: c.slug,
      label: c.label,
      url: `${siteUrl}/${c.slug}`,
    })),
    _instructions: [
      "This file is a reference for all SEO metadata in the generated site.",
      "To update SEO, edit the articles.ts file and regenerate.",
    ],
  };
  return JSON.stringify(manifest, null, 2);
}
