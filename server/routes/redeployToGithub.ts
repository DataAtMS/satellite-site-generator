/**
 * redeployToGithub.ts
 *
 * Pushes updated site files to an existing GitHub repo when content is edited.
 * Netlify auto-deploys on every push to main, so this is the only step needed
 * for content updates after initial setup.
 *
 * Flow:
 *  1. Load site + articles from DB
 *  2. Rebuild all files using current DB data
 *  3. Get the current HEAD commit SHA from GitHub
 *  4. Create a new git tree with updated files
 *  5. Create a new commit on top of HEAD
 *  6. Update the main branch ref to the new commit
 */

import type { Request, Response } from "express";
import { Octokit } from "@octokit/rest";
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
import {
  getSiteById,
  getArticlesBySiteId,
  getCategoriesBySiteId,
  createDeploy,
  updateDeploy,
  updateSite,
} from "../db.js";

interface RedeployBody {
  siteId: number;
  message?: string;
}

function sendLog(
  res: Response,
  message: string,
  level: "info" | "success" | "error" | "warning" = "info"
) {
  res.write(JSON.stringify({ type: "log", message, level }) + "\n");
}

export async function redeployToGithubHandler(req: Request, res: Response) {
  const { siteId, message: commitMessage } = req.body as RedeployBody;

  if (!siteId) {
    return res.status(400).json({ error: "Missing required field: siteId" });
  }

  const token = process.env.GITHUB_PAT;
  if (!token) {
    return res.status(500).json({ error: "GITHUB_PAT is not configured" });
  }

  // Set streaming headers
  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Transfer-Encoding", "chunked");
  res.setHeader("Cache-Control", "no-cache");
  res.flushHeaders();

  const octokit = new Octokit({ auth: token });
  let dbDeployId: number | null = null;

  try {
    // ── Step 1: Load site data from DB ───────────────────────────────────────
    sendLog(res, "Loading site data from database...");
    const site = await getSiteById(siteId);
    if (!site) throw new Error(`Site ${siteId} not found`);
    if (!site.githubOwner || !site.githubRepo) {
      throw new Error(`Site ${siteId} has no GitHub repo configured`);
    }

    const dbArticles = await getArticlesBySiteId(siteId);
    const dbCategories = await getCategoriesBySiteId(siteId);

    if (dbArticles.length === 0) throw new Error("No articles found for this site");

    sendLog(res, `Loaded ${dbArticles.length} articles, ${dbCategories.length} categories`, "success");

    const owner = site.githubOwner;
    const repo = site.githubRepo;

    // ── Step 2: Reconstruct siteConfig from DB ───────────────────────────────
    const siteConfig = {
      domain: site.domain ?? site.siteName,
      siteName: site.siteName,
      tagline: site.tagline ?? "",
      heroSubtitle: site.heroSubtitle ?? "",
      accentColor: site.accentColor,
      partnerName: site.partnerName ?? "",
      partnerUrl: site.partnerUrl ?? "",
      partnerDescription: site.partnerDescription ?? "",
      twitterHandle: site.twitterHandle ?? "",
      categories: dbCategories
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((c) => ({ label: c.label, slug: c.slug })),
    };

    const articles = dbArticles.map((a) => ({
      topicId: a.slug,
      slug: a.slug,
      title: a.title,
      categorySlug: a.categorySlug,
      categoryLabel: a.categoryLabel,
      metaDescription: a.metaDescription ?? "",
      excerpt: a.excerpt ?? "",
      content: a.content,
      datePublished: a.datePublished ?? "",
      dateModified: new Date().toISOString().slice(0, 10), // always today on redeploy
      thumbnail: a.thumbnail ?? "",
      altText: a.altText ?? "",
    }));

    // ── Step 3: Rebuild all files ────────────────────────────────────────────
    sendLog(res, "Rebuilding site files...");
    const files = new Map<string, string>();
    files.set("package.json", buildPackageJson(siteConfig));
    files.set("vite.config.ts", buildViteConfig());
    files.set("tsconfig.json", buildTsConfig());
    files.set("vercel.json", JSON.stringify({ rewrites: [{ source: "/(.*)", destination: "/index.html" }] }, null, 2) + "\n");
    files.set("README.md", buildReadme(siteConfig, articles.length));
    files.set("seo-manifest.json", buildSeoManifestJson(siteConfig, articles));
    files.set("client/index.html", buildIndexHtml(siteConfig));
    files.set("client/src/main.tsx", buildMainTsx());
    files.set("client/src/index.css", buildIndexCss(siteConfig));
    files.set("client/src/data/articles.ts", buildArticlesTs(siteConfig, articles, siteConfig.accentColor));
    files.set("client/src/App.tsx", buildAppTsx(siteConfig));
    files.set("client/src/pages/Home.tsx", buildHomeTsx(siteConfig));
    files.set("client/src/pages/CategoryPage.tsx", buildCategoryPageTsx(siteConfig, articles));
    files.set("client/src/pages/ArticlePage.tsx", buildArticlePageTsx(siteConfig));
    files.set("client/src/pages/Sitemap.tsx", buildSitemapTsx(siteConfig));
    files.set("client/public/robots.txt", buildRobotsTxt(siteConfig));
    files.set("client/public/_redirects", "/* /index.html 200\n");
    sendLog(res, `${files.size} files rebuilt`, "success");

    // ── Step 4: Get current HEAD SHA ─────────────────────────────────────────
    sendLog(res, `Getting current HEAD from ${owner}/${repo}...`);
    const { data: refData } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: "heads/main",
    });
    const parentSha = refData.object.sha;
    sendLog(res, `Current HEAD: ${parentSha.slice(0, 7)}`);

    // ── Step 5: Create new git tree ──────────────────────────────────────────
    sendLog(res, "Creating updated git tree...");
    const treeItems = Array.from(files.entries()).map(([filePath, content]) => ({
      path: filePath,
      mode: "100644" as const,
      type: "blob" as const,
      content,
    }));

    const { data: tree } = await octokit.rest.git.createTree({
      owner,
      repo,
      tree: treeItems,
    });

    // ── Step 6: Create commit ────────────────────────────────────────────────
    sendLog(res, "Creating commit...");
    const msg = commitMessage ?? `Content update: ${new Date().toISOString().slice(0, 10)}`;
    const { data: commit } = await octokit.rest.git.createCommit({
      owner,
      repo,
      message: msg,
      tree: tree.sha,
      parents: [parentSha],
    });
    sendLog(res, `Commit created: ${commit.sha.slice(0, 7)}`, "success");

    // ── Step 7: Update branch ref ────────────────────────────────────────────
    sendLog(res, "Pushing to main branch...");
    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: "heads/main",
      sha: commit.sha,
    });
    sendLog(res, "Push complete — Netlify will auto-deploy", "success");

    // ── Step 8: Record deploy in DB ──────────────────────────────────────────
    const dbDeploy = await createDeploy({
      siteId,
      commitSha: commit.sha,
      message: msg,
      status: "building",
    });
    dbDeployId = dbDeploy.id;

    await updateSite(siteId, { lastDeployedAt: new Date(), status: "deploying" });

    res.write(
      JSON.stringify({
        type: "redeploy_complete",
        siteId,
        commitSha: commit.sha,
        githubUrl: `https://github.com/${owner}/${repo}`,
        netlifyUrl: site.netlifyUrl,
        deployId: dbDeployId,
      }) + "\n"
    );

    res.end();
  } catch (err: unknown) {
    console.error("[redeployToGithub] Error:", err);

    if (dbDeployId) {
      await updateDeploy(dbDeployId, { status: "failed", completedAt: new Date() }).catch(() => {});
    }

    res.write(
      JSON.stringify({
        type: "error",
        message: err instanceof Error ? err.message : "Unknown error during redeploy",
      }) + "\n"
    );
    res.end();
  }
}
