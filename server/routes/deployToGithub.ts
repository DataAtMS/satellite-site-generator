/**
 * deployToGithub.ts
 *
 * Creates a new GitHub repo and pushes all generated site files as an initial commit
 * using the GitHub REST API (no git binary required — pure HTTP via @octokit/rest).
 *
 * Flow:
 *  1. Authenticate as the token owner, get their login
 *  2. Create a new public repo under their account
 *  3. Build all site files in memory (same builders as generateSite.ts)
 *  4. Create a git tree with all files
 *  5. Create a commit pointing to that tree
 *  6. Update the default branch ref to point to the new commit
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
  createSite,
  createCategories,
  createArticles,
  createDeploy,
  updateSite,
  updateDeploy,
} from "../db.js";

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

function sendLog(
  res: Response,
  message: string,
  level: "info" | "success" | "error" | "warning" = "info"
) {
  res.write(JSON.stringify({ type: "log", message, level }) + "\n");
}

/** Convert a domain/site name to a valid GitHub repo name */
function toRepoName(domain: string, siteName: string): string {
  const base = domain
    .replace(/^www\./, "")
    .replace(/\.[^.]+$/, "") // strip TLD
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || siteName.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 64);
}

/** Build all site files as a map of path → content string */
function buildAllFiles(
  siteConfig: SiteConfig,
  articles: WrittenArticle[]
): Map<string, string> {
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
  files.set("netlify.toml", `[build]\n  command = "npm install && npm run build"\n  publish = "dist"\n\n[build.environment]\n  NODE_VERSION = "20"\n`);

  return files;
}

export async function deployToGithubHandler(req: Request, res: Response) {
  const { siteConfig, articles } = req.body as {
    siteConfig: SiteConfig;
    articles: WrittenArticle[];
  };

  if (!siteConfig || !articles) {
    return res.status(400).json({ error: "Missing required fields: siteConfig and articles" });
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
  let siteId: number | null = null;
  let deployId: number | null = null;

  try {
    // ── Step 1: Get authenticated user ──────────────────────────────────────
    sendLog(res, "Authenticating with GitHub...");
    const { data: ghUser } = await octokit.rest.users.getAuthenticated();
    const owner = ghUser.login;
    sendLog(res, `Authenticated as ${owner}`, "success");

    // ── Step 2: Persist site to DB ───────────────────────────────────────────
    sendLog(res, "Saving site to database...");
    const repoName = toRepoName(siteConfig.domain, siteConfig.siteName);
    const site = await createSite({
      githubOwner: owner,
      githubRepo: repoName,
      siteName: siteConfig.siteName,
      tagline: siteConfig.tagline,
      heroSubtitle: siteConfig.heroSubtitle,
      accentColor: siteConfig.accentColor,
      domain: siteConfig.domain,
      partnerName: siteConfig.partnerName,
      partnerUrl: siteConfig.partnerUrl,
      partnerDescription: siteConfig.partnerDescription,
      twitterHandle: siteConfig.twitterHandle,
      status: "deploying",
    });
    siteId = site.id;

    await createCategories(siteId, siteConfig.categories);
    await createArticles(
      siteId,
      articles.map((a) => ({
        slug: a.slug,
        title: a.title,
        categorySlug: a.categorySlug,
        categoryLabel: a.categoryLabel,
        content: a.content,
        metaDescription: a.metaDescription,
        excerpt: a.excerpt,
        altText: a.altText,
        thumbnail: a.thumbnail,
        datePublished: a.datePublished,
        dateModified: a.dateModified,
      }))
    );
    sendLog(res, `Site saved (id=${siteId})`, "success");

    // ── Step 3: Create GitHub repo ───────────────────────────────────────────
    sendLog(res, `Creating GitHub repo: ${owner}/${repoName}...`);

    // Check if repo already exists and delete it (for re-deploys)
    try {
      await octokit.rest.repos.get({ owner, repo: repoName });
      sendLog(res, `Repo ${repoName} already exists — deleting for fresh deploy...`, "warning");
      await octokit.rest.repos.delete({ owner, repo: repoName });
    } catch {
      // Repo doesn't exist, that's fine
    }

    const { data: repo } = await octokit.rest.repos.createForAuthenticatedUser({
      name: repoName,
      description: `${siteConfig.siteName} — generated by Site Generator`,
      private: false,
      auto_init: true, // Creates an initial commit so the repo is not empty
    });
    const githubUrl = repo.html_url;
    sendLog(res, `Repo created: ${githubUrl}`, "success");

    await updateSite(siteId, { githubUrl, githubRepo: repoName, githubOwner: owner });

    // ── Step 4: Build all files ──────────────────────────────────────────────
    sendLog(res, `Building ${articles.length} article files + site scaffolding...`);
    const files = buildAllFiles(siteConfig, articles);
    sendLog(res, `${files.size} files ready`, "success");

    // ── Step 5: Get base commit SHA (from auto_init) ─────────────────────────
    // GitHub needs a base tree when the repo is initialized with auto_init:true
    sendLog(res, "Reading initial commit...");
    const { data: refData } = await octokit.rest.git.getRef({
      owner,
      repo: repoName,
      ref: "heads/main",
    });
    const baseCommitSha = refData.object.sha;
    const { data: baseCommit } = await octokit.rest.git.getCommit({
      owner,
      repo: repoName,
      commit_sha: baseCommitSha,
    });
    const baseTreeSha = baseCommit.tree.sha;

    // ── Step 6: Create git tree via GitHub API ───────────────────────────────
    sendLog(res, "Creating git tree...");

    const treeItems = Array.from(files.entries()).map(([filePath, content]) => ({
      path: filePath,
      mode: "100644" as const,
      type: "blob" as const,
      content,
    }));

    const { data: tree } = await octokit.rest.git.createTree({
      owner,
      repo: repoName,
      base_tree: baseTreeSha, // Build on top of the auto_init commit
      tree: treeItems,
    });
    sendLog(res, `Git tree created (${treeItems.length} blobs)`, "success");

    // ── Step 7: Create commit ────────────────────────────────────────────────
    sendLog(res, "Creating initial commit...");
    const { data: commit } = await octokit.rest.git.createCommit({
      owner,
      repo: repoName,
      message: `Initial site generation: ${siteConfig.siteName}`,
      tree: tree.sha,
      parents: [baseCommitSha], // Parent is the auto_init commit
    });
    sendLog(res, `Commit created: ${commit.sha.slice(0, 7)}`, "success");

    // ── Step 8: Update main branch ref to point to new commit ───────────────
    sendLog(res, "Updating main branch...");
    await octokit.rest.git.updateRef({
      owner,
      repo: repoName,
      ref: "heads/main",
      sha: commit.sha,
      force: true,
    });
    sendLog(res, "Branch 'main' updated", "success");

    // ── Step 8: Record deploy ────────────────────────────────────────────────
    const deploy = await createDeploy({
      siteId,
      commitSha: commit.sha,
      message: `Initial generation: ${siteConfig.siteName}`,
      status: "ready",
      completedAt: new Date(),
    });
    deployId = deploy.id;

    await updateSite(siteId, { status: "live", lastDeployedAt: new Date() });

    sendLog(res, `Successfully deployed to GitHub: ${githubUrl}`, "success");

    res.write(
      JSON.stringify({
        type: "github_complete",
        siteId,
        deployId,
        githubUrl,
        owner,
        repo: repoName,
        commitSha: commit.sha,
      }) + "\n"
    );

    res.end();
  } catch (err: unknown) {
    console.error("[deployToGithub] Error:", err);

    // Update DB status to failed if we got that far
    if (siteId) {
      await updateSite(siteId, { status: "failed" }).catch(() => {});
    }
    if (deployId) {
      await updateDeploy(deployId, { status: "failed", completedAt: new Date() }).catch(() => {});
    }

    res.write(
      JSON.stringify({
        type: "error",
        message: err instanceof Error ? err.message : "Unknown error during GitHub deploy",
      }) + "\n"
    );
    res.end();
  }
}
