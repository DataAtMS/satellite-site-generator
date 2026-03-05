import type { Request, Response } from "express";
import archiver from "archiver";
import path from "path";
import { fileURLToPath } from "url";
import { buildArticlesTs } from "../builders/articlesData.js";
import { buildAppTsx } from "../builders/appBuilder.js";
import { buildHomeTsx } from "../builders/homeBuilder.js";
import { buildCategoryPageTsx } from "../builders/categoryPageBuilder.js";
import { buildArticlePageTsx } from "../builders/articlePageBuilder.js";
import { buildSitemapTsx } from "../builders/sitemapBuilder.js";
import { buildIndexHtml } from "../builders/indexHtmlBuilder.js";
import { buildSeoManifestJson } from "../builders/seoManifestBuilder.js";
import { buildRobotsTxt } from "../builders/robotsBuilder.js";
import { buildPackageJson } from "../builders/packageJsonBuilder.js";
import { buildViteConfig } from "../builders/viteConfigBuilder.js";
import { buildTsConfig } from "../builders/tsConfigBuilder.js";
import { buildIndexCss } from "../builders/indexCssBuilder.js";
import { buildMainTsx } from "../builders/mainTsxBuilder.js";
import { buildReadme } from "../builders/readmeBuilder.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface SiteConfig {
  domain: string;
  siteName: string;
  tagline: string;
  heroSubtitle: string;
  accentColor: string;
  partnerName: string;
  partnerUrl: string;
  partnerDescription: string;
  twitterHandle: string;
  categories: { label: string; slug: string }[];
}

interface WrittenArticle {
  topicId: string;
  slug: string;
  title: string;
  categorySlug: string;
  categoryLabel: string;
  metaDescription: string;
  excerpt: string;
  content: string;
  datePublished: string;
  dateModified: string;
  thumbnail: string;
  altText: string;
}

function sendLog(res: Response, message: string, level: "info" | "success" | "error" | "warning" = "info") {
  res.write(JSON.stringify({ type: "log", message, level }) + "\n");
}

export async function generateSiteHandler(req: Request, res: Response) {
  const { siteConfig, articles } = req.body as {
    siteConfig: SiteConfig;
    articles: WrittenArticle[];
  };

  if (!siteConfig || !articles) {
    return res.status(400).json({ error: "Missing required fields: siteConfig and articles" });
  }

  // Set streaming headers
  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Transfer-Encoding", "chunked");
  res.setHeader("Cache-Control", "no-cache");
  res.flushHeaders();

  try {
    sendLog(res, `Building ${siteConfig.siteName} — ${articles.length} articles, ${siteConfig.categories.length} categories`);

    // Create the ZIP archive in memory
    const archive = archiver("zip", { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    archive.on("data", (chunk: Buffer) => chunks.push(chunk));

    const archiveFinished = new Promise<void>((resolve, reject) => {
      archive.on("end", resolve);
      archive.on("error", reject);
    });

    // ── Build all files ──────────────────────────────────────────────────────

    sendLog(res, "Generating package.json...");
    archive.append(buildPackageJson(siteConfig), { name: "package.json" });

    sendLog(res, "Generating vite.config.ts...");
    archive.append(buildViteConfig(), { name: "vite.config.ts" });

    sendLog(res, "Generating tsconfig.json...");
    archive.append(buildTsConfig(), { name: "tsconfig.json" });

    sendLog(res, "Generating client/index.html...");
    archive.append(buildIndexHtml(siteConfig), { name: "client/index.html" });

    sendLog(res, "Generating client/src/main.tsx...");
    archive.append(buildMainTsx(), { name: "client/src/main.tsx" });

    sendLog(res, "Generating client/src/index.css...");
    archive.append(buildIndexCss(siteConfig), { name: "client/src/index.css" });

    sendLog(res, "Generating article data file...");
    archive.append(buildArticlesTs(siteConfig, articles, siteConfig.accentColor), {
      name: "client/src/data/articles.ts",
    });

    sendLog(res, "Generating App.tsx with routes...");
    archive.append(buildAppTsx(siteConfig), { name: "client/src/App.tsx" });

    sendLog(res, "Generating homepage...");
    archive.append(buildHomeTsx(siteConfig), { name: "client/src/pages/Home.tsx" });

    sendLog(res, "Generating category pages...");
    archive.append(buildCategoryPageTsx(siteConfig, articles), {
      name: "client/src/pages/CategoryPage.tsx",
    });

    sendLog(res, "Generating article page component...");
    archive.append(buildArticlePageTsx(siteConfig), {
      name: "client/src/pages/ArticlePage.tsx",
    });

    sendLog(res, "Generating sitemap page...");
    archive.append(buildSitemapTsx(siteConfig), {
      name: "client/src/pages/Sitemap.tsx",
    });

    sendLog(res, "Generating robots.txt...");
    archive.append(buildRobotsTxt(siteConfig), { name: "client/public/robots.txt" });

    sendLog(res, "Generating SEO manifest JSON...");
    archive.append(buildSeoManifestJson(siteConfig, articles), {
      name: "seo-manifest.json",
    });

    sendLog(res, "Generating README...");
    archive.append(buildReadme(siteConfig, articles.length), { name: "README.md" });

    sendLog(res, "Generating _redirects for SPA routing (Netlify)...");
    archive.append("/* /index.html 200\n", { name: "client/public/_redirects" });

    sendLog(res, "Generating vercel.json for SPA routing (Vercel)...");
    archive.append(JSON.stringify({ rewrites: [{ source: "/(.*)", destination: "/index.html" }] }, null, 2) + "\n", { name: "vercel.json" });

    // ── Finalize archive ─────────────────────────────────────────────────────
    sendLog(res, "Finalizing ZIP archive...");
    archive.finalize();
    await archiveFinished;

    const zipBuffer = Buffer.concat(chunks);
    const base64 = zipBuffer.toString("base64");
    const dataUrl = `data:application/zip;base64,${base64}`;

    sendLog(res, `ZIP generated: ${Math.round(zipBuffer.length / 1024)}KB`, "success");
    sendLog(res, "All files assembled successfully.", "success");

    res.write(
      JSON.stringify({
        type: "complete",
        downloadUrl: dataUrl,
        filename: `${siteConfig.domain.replace(/\./g, "-")}-site.zip`,
      }) + "\n"
    );

    res.end();
  } catch (err: unknown) {
    console.error("[generateSite] Error:", err);
    res.write(
      JSON.stringify({
        type: "error",
        message: err instanceof Error ? err.message : "Unknown error during generation",
      }) + "\n"
    );
    res.end();
  }
}
