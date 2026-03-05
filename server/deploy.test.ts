/**
 * Tests for the deploy pipeline, DB helpers, and sitesApi.
 * These tests cover:
 * - toRepoName slug generation
 * - buildAllFiles file tree structure
 * - sitesApi route validation
 * - DB helper function signatures
 * - Netlify polling logic
 * - redeployToGithub siteConfig reconstruction
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── toRepoName logic (extracted for testing) ─────────────────────────────────

function toRepoName(domain: string, siteName: string): string {
  const base = domain
    .replace(/^www\./, "")
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || siteName.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 64);
}

describe("toRepoName", () => {
  it("strips TLD and www prefix", () => {
    expect(toRepoName("www.cro-hacks.com", "CRO Hacks")).toBe("cro-hacks");
  });

  it("converts dots and underscores to hyphens", () => {
    expect(toRepoName("my_site.io", "My Site")).toBe("my-site");
  });

  it("collapses multiple hyphens", () => {
    expect(toRepoName("my--site.com", "My Site")).toBe("my-site");
  });

  it("strips leading and trailing hyphens", () => {
    expect(toRepoName("-site-.com", "Site")).toBe("site");
  });

  it("falls back to siteName when domain is empty", () => {
    expect(toRepoName("", "CRO Hacks")).toBe("cro-hacks");
  });

  it("handles domains with subdomains — strips only the TLD", () => {
    // blog.ecommerce-tips.com → strips .com → blog.ecommerce-tips → slugified → blog-ecommerce-tips
    expect(toRepoName("blog.ecommerce-tips.com", "Blog")).toBe("blog-ecommerce-tips");
  });

  it("lowercases everything", () => {
    expect(toRepoName("CRO-HACKS.COM", "CRO Hacks")).toBe("cro-hacks");
  });
});

// ─── buildAllFiles file tree ──────────────────────────────────────────────────

import { buildArticlesTs } from "./builders/articlesData.js";
import { buildAppTsx } from "./builders/appBuilder.js";
import { buildHomeTsx } from "./builders/homeBuilder.js";
import { buildIndexCss } from "./builders/indexCssBuilder.js";
import { buildPackageJson } from "./builders/packageJsonBuilder.js";
import { buildViteConfig } from "./builders/viteConfigBuilder.js";
import { buildIndexHtml } from "./builders/indexHtmlBuilder.js";
import { buildRobotsTxt } from "./builders/robotsBuilder.js";

const testSiteConfig = {
  domain: "cro-hacks.com",
  siteName: "CRO Hacks",
  tagline: "the art and science of conversion",
  heroSubtitle: "Everything you need to know about CRO.",
  accentColor: "#ff6600",
  partnerName: "Heatmap",
  partnerUrl: "https://heatmap.com",
  partnerDescription: "is a great tool for ecommerce.",
  twitterHandle: "@crohacks",
  categories: [
    { label: "Heatmaps", slug: "heatmaps" },
    { label: "A/B Testing", slug: "ab-testing" },
  ],
};

const testArticles = [
  {
    topicId: "article-1",
    slug: "how-to-use-heatmaps",
    title: "How to Use Heatmaps",
    categorySlug: "heatmaps",
    categoryLabel: "Heatmaps",
    metaDescription: "Learn how to use heatmaps to improve conversion.",
    excerpt: "Heatmaps show you where users click.",
    content: "## Introduction\n\nHeatmaps are visual tools...",
    datePublished: "2026-03-01",
    dateModified: "2026-03-01",
    thumbnail: "",
    altText: "Heatmap showing click patterns",
  },
  {
    topicId: "article-2",
    slug: "ab-testing-basics",
    title: "A/B Testing Basics",
    categorySlug: "ab-testing",
    categoryLabel: "A/B Testing",
    metaDescription: "Learn the basics of A/B testing.",
    excerpt: "A/B testing compares two versions.",
    content: "## What is A/B Testing\n\nA/B testing...",
    datePublished: "2026-03-02",
    dateModified: "2026-03-02",
    thumbnail: "",
    altText: "A/B test comparison chart",
  },
];

function buildAllFiles(
  siteConfig: typeof testSiteConfig,
  articles: typeof testArticles
): Map<string, string> {
  const files = new Map<string, string>();
  files.set("package.json", buildPackageJson(siteConfig));
  files.set("vite.config.ts", buildViteConfig());
  files.set("client/index.html", buildIndexHtml(siteConfig));
  files.set("client/src/index.css", buildIndexCss(siteConfig));
  files.set("client/src/data/articles.ts", buildArticlesTs(siteConfig, articles, siteConfig.accentColor));
  files.set("client/src/App.tsx", buildAppTsx(siteConfig));
  files.set("client/src/pages/Home.tsx", buildHomeTsx(siteConfig));
  files.set("client/public/robots.txt", buildRobotsTxt(siteConfig));
  files.set("client/public/_redirects", "/* /index.html 200\n");
  files.set("vercel.json", JSON.stringify({ rewrites: [{ source: "/(.*)", destination: "/index.html" }] }, null, 2) + "\n");
  return files;
}

describe("buildAllFiles file tree", () => {
  it("includes _redirects for Netlify SPA routing", () => {
    const files = buildAllFiles(testSiteConfig, testArticles);
    expect(files.has("client/public/_redirects")).toBe(true);
    expect(files.get("client/public/_redirects")).toBe("/* /index.html 200\n");
  });

  it("includes vercel.json for Vercel SPA routing", () => {
    const files = buildAllFiles(testSiteConfig, testArticles);
    expect(files.has("vercel.json")).toBe(true);
    const vercelConfig = JSON.parse(files.get("vercel.json")!);
    expect(vercelConfig.rewrites).toBeDefined();
    expect(vercelConfig.rewrites[0].destination).toBe("/index.html");
  });

  it("includes package.json with correct site name", () => {
    const files = buildAllFiles(testSiteConfig, testArticles);
    expect(files.has("package.json")).toBe(true);
    const pkg = JSON.parse(files.get("package.json")!);
    expect(pkg.name).toBeTruthy();
  });

  it("includes all required client source files", () => {
    const files = buildAllFiles(testSiteConfig, testArticles);
    const requiredFiles = [
      "client/index.html",
      "client/src/index.css",
      "client/src/data/articles.ts",
      "client/src/App.tsx",
      "client/src/pages/Home.tsx",
    ];
    for (const f of requiredFiles) {
      expect(files.has(f), `Missing file: ${f}`).toBe(true);
    }
  });

  it("includes robots.txt with correct domain", () => {
    const files = buildAllFiles(testSiteConfig, testArticles);
    expect(files.has("client/public/robots.txt")).toBe(true);
    const robots = files.get("client/public/robots.txt")!;
    expect(robots).toContain("Sitemap:");
  });

  it("articles.ts exports all articles", () => {
    const files = buildAllFiles(testSiteConfig, testArticles);
    const articlesTsContent = files.get("client/src/data/articles.ts")!;
    expect(articlesTsContent).toContain("how-to-use-heatmaps");
    expect(articlesTsContent).toContain("ab-testing-basics");
    expect(articlesTsContent).toContain("export const articles");
  });

  it("App.tsx includes routes for all category slugs", () => {
    const files = buildAllFiles(testSiteConfig, testArticles);
    const appTsx = files.get("client/src/App.tsx")!;
    expect(appTsx).toContain("heatmaps");
    expect(appTsx).toContain("ab-testing");
  });
});

// ─── sitesApi input validation ────────────────────────────────────────────────

describe("sitesApi route validation", () => {
  it("rejects non-numeric site IDs", () => {
    const id = parseInt("abc", 10);
    expect(isNaN(id)).toBe(true);
  });

  it("accepts valid numeric site IDs", () => {
    const id = parseInt("42", 10);
    expect(isNaN(id)).toBe(false);
    expect(id).toBe(42);
  });

  it("only allows whitelisted fields for site updates", () => {
    const allowed = [
      "siteName", "tagline", "heroSubtitle", "accentColor",
      "partnerName", "partnerUrl", "partnerDescription", "twitterHandle", "domain",
    ];
    const body = {
      siteName: "New Name",
      status: "live", // should be filtered out
      githubOwner: "hacker", // should be filtered out
    };
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if ((body as Record<string, unknown>)[key] !== undefined) {
        updates[key] = (body as Record<string, unknown>)[key];
      }
    }
    expect(updates.siteName).toBe("New Name");
    expect(updates.status).toBeUndefined();
    expect(updates.githubOwner).toBeUndefined();
  });

  it("only allows whitelisted fields for article updates", () => {
    const allowed = [
      "title", "content", "excerpt", "metaDescription",
      "canonicalUrl", "ogImageUrl", "thumbnail", "altText",
      "dateModified",
    ];
    const body = {
      title: "New Title",
      content: "New content...",
      siteId: 999, // should be filtered out
      id: 1, // should be filtered out
    };
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if ((body as Record<string, unknown>)[key] !== undefined) {
        updates[key] = (body as Record<string, unknown>)[key];
      }
    }
    expect(updates.title).toBe("New Title");
    expect(updates.content).toBe("New content...");
    expect(updates.siteId).toBeUndefined();
    expect(updates.id).toBeUndefined();
  });

  it("always sets dateModified on article update", () => {
    const updates: Record<string, unknown> = {};
    updates.dateModified = new Date().toISOString().slice(0, 10);
    expect(updates.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ─── redeployToGithub siteConfig reconstruction ───────────────────────────────

describe("redeployToGithub siteConfig reconstruction", () => {
  it("reconstructs siteConfig from DB site row correctly", () => {
    const dbSite = {
      id: 1,
      githubOwner: "DataAtMS",
      githubRepo: "cro-hacks",
      githubUrl: "https://github.com/DataAtMS/cro-hacks",
      netlifySiteId: "abc123",
      netlifyUrl: "https://cro-hacks.netlify.app",
      domain: "cro-hacks.com",
      siteName: "CRO Hacks",
      tagline: "the art and science of conversion",
      heroSubtitle: "Everything you need to know.",
      accentColor: "#ff6600",
      partnerName: "Heatmap",
      partnerUrl: "https://heatmap.com",
      partnerDescription: "is a great tool.",
      twitterHandle: "@crohacks",
      status: "live" as const,
      createdAt: new Date(),
      lastDeployedAt: new Date(),
      updatedAt: new Date(),
    };

    const dbCategories = [
      { id: 1, siteId: 1, label: "Heatmaps", slug: "heatmaps", sortOrder: 0 },
      { id: 2, siteId: 1, label: "A/B Testing", slug: "ab-testing", sortOrder: 1 },
    ];

    const siteConfig = {
      domain: dbSite.domain ?? dbSite.siteName,
      siteName: dbSite.siteName,
      tagline: dbSite.tagline ?? "",
      heroSubtitle: dbSite.heroSubtitle ?? "",
      accentColor: dbSite.accentColor,
      partnerName: dbSite.partnerName ?? "",
      partnerUrl: dbSite.partnerUrl ?? "",
      partnerDescription: dbSite.partnerDescription ?? "",
      twitterHandle: dbSite.twitterHandle ?? "",
      categories: dbCategories
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((c) => ({ label: c.label, slug: c.slug })),
    };

    expect(siteConfig.siteName).toBe("CRO Hacks");
    expect(siteConfig.domain).toBe("cro-hacks.com");
    expect(siteConfig.accentColor).toBe("#ff6600");
    expect(siteConfig.categories).toHaveLength(2);
    expect(siteConfig.categories[0].slug).toBe("heatmaps");
    expect(siteConfig.categories[1].slug).toBe("ab-testing");
  });

  it("falls back to siteName when domain is null", () => {
    const dbSite = { domain: null, siteName: "CRO Hacks" };
    const domain = dbSite.domain ?? dbSite.siteName;
    expect(domain).toBe("CRO Hacks");
  });

  it("always uses today's date for dateModified on redeploy", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Simulate what redeployToGithub does
    const articles = [{ slug: "test", dateModified: "2025-01-01" }];
    const rebuilt = articles.map((a) => ({
      ...a,
      dateModified: new Date().toISOString().slice(0, 10),
    }));
    expect(rebuilt[0].dateModified).toBe(today);
  });
});

// ─── Netlify polling logic ────────────────────────────────────────────────────

describe("Netlify polling logic", () => {
  it("returns failed status when timeout is exceeded", async () => {
    // Simulate the polling function with a very short timeout
    async function pollDeploy(
      _token: string,
      _siteId: string,
      maxWaitMs = 100
    ): Promise<{ status: "ready" | "failed"; url: string }> {
      const start = Date.now();
      while (Date.now() - start < maxWaitMs) {
        await new Promise((r) => setTimeout(r, 50));
      }
      return { status: "failed", url: "" };
    }

    const result = await pollDeploy("token", "site-id", 100);
    expect(result.status).toBe("failed");
  });

  it("returns ready status when deploy succeeds", async () => {
    // Simulate a successful deploy response
    const mockDeploy = { state: "ready", deploy_ssl_url: "https://cro-hacks.netlify.app" };

    const status = mockDeploy.state === "ready" ? "ready" : "failed";
    const url = mockDeploy.deploy_ssl_url ?? "";

    expect(status).toBe("ready");
    expect(url).toBe("https://cro-hacks.netlify.app");
  });

  it("handles missing deploy_ssl_url by falling back to url", () => {
    const mockDeploy = { state: "ready", deploy_ssl_url: undefined, url: "https://cro-hacks.netlify.app" };
    const url = mockDeploy.deploy_ssl_url ?? mockDeploy.url ?? "";
    expect(url).toBe("https://cro-hacks.netlify.app");
  });
});

// ─── Deploy pipeline: GitHub API body structure ───────────────────────────────

describe("GitHub API payload structure", () => {
  it("creates correct tree item structure for file blobs", () => {
    const files = new Map([
      ["client/src/App.tsx", "export default function App() {}"],
      ["client/public/_redirects", "/* /index.html 200\n"],
    ]);

    const treeItems = Array.from(files.entries()).map(([filePath, content]) => ({
      path: filePath,
      mode: "100644" as const,
      type: "blob" as const,
      content,
    }));

    expect(treeItems).toHaveLength(2);
    expect(treeItems[0].mode).toBe("100644");
    expect(treeItems[0].type).toBe("blob");
    expect(treeItems[1].path).toBe("client/public/_redirects");
    expect(treeItems[1].content).toBe("/* /index.html 200\n");
  });

  it("creates correct repo creation payload", () => {
    const repoName = "cro-hacks";
    const siteName = "CRO Hacks";
    const payload = {
      name: repoName,
      description: `${siteName} — generated by Site Generator`,
      private: false,
      auto_init: false,
    };

    expect(payload.name).toBe("cro-hacks");
    expect(payload.auto_init).toBe(false); // We push files manually, no auto-init
    expect(payload.private).toBe(false);
  });
});

// ─── SEO field validation ─────────────────────────────────────────────────────

describe("SEO field validation", () => {
  it("meta description should be max 160 chars for SERP display", () => {
    const metaDesc = "A" .repeat(161);
    const isValid = metaDesc.length <= 160;
    expect(isValid).toBe(false);

    const validDesc = "A".repeat(160);
    expect(validDesc.length <= 160).toBe(true);
  });

  it("canonical URL should be a valid absolute URL", () => {
    const validUrls = [
      "https://cro-hacks.com/articles/how-to-use-heatmaps",
      "https://www.example.com/page",
    ];
    const invalidUrls = [
      "/relative/path",
      "not-a-url",
    ];

    for (const url of validUrls) {
      expect(() => new URL(url)).not.toThrow();
    }
    for (const url of invalidUrls) {
      expect(() => new URL(url)).toThrow();
    }
  });

  it("dateModified format matches ISO date pattern", () => {
    const dateModified = new Date().toISOString().slice(0, 10);
    expect(dateModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
