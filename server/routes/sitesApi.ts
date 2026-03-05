/**
 * sitesApi.ts
 *
 * REST API for managing generated sites and their articles.
 * Mounted at /api/sites in server/index.ts.
 *
 * Routes:
 *  GET    /api/sites              — list all sites
 *  GET    /api/sites/:id          — get site with articles and categories
 *  PATCH  /api/sites/:id          — update site config fields
 *  GET    /api/sites/:id/articles — list articles for a site
 *  PATCH  /api/sites/:id/articles/:articleId — update article content/SEO
 *  GET    /api/sites/:id/deploys  — list deploy history
 */

import { Router, type Request, type Response } from "express";
import {
  getAllSites,
  getSiteById,
  updateSite,
  getArticlesBySiteId,
  getCategoriesBySiteId,
  updateArticle,
  getDeploysBySiteId,
} from "../db.js";
import { siteArticles } from "../../drizzle/schema.js";
import { eq } from "drizzle-orm";
import { db } from "../db.js";

const router = Router();

// ── List all sites ────────────────────────────────────────────────────────────
router.get("/", async (_req: Request, res: Response) => {
  try {
    const sites = await getAllSites();
    res.json({ sites });
  } catch (err) {
    console.error("[sitesApi] GET /:", err);
    res.status(500).json({ error: "Failed to fetch sites" });
  }
});

// ── Get single site with articles and categories ──────────────────────────────
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid site ID" });

    const site = await getSiteById(id);
    if (!site) return res.status(404).json({ error: "Site not found" });

    const [articles, categories, deploys] = await Promise.all([
      getArticlesBySiteId(id),
      getCategoriesBySiteId(id),
      getDeploysBySiteId(id),
    ]);

    res.json({ site, articles, categories, deploys });
  } catch (err) {
    console.error("[sitesApi] GET /:id:", err);
    res.status(500).json({ error: "Failed to fetch site" });
  }
});

// ── Update site config ────────────────────────────────────────────────────────
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid site ID" });

    const allowed = [
      "siteName", "tagline", "heroSubtitle", "accentColor",
      "partnerName", "partnerUrl", "partnerDescription", "twitterHandle", "domain",
      "netlifyUrl", "netlifySiteId", "status",
    ];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const updated = await updateSite(id, updates);
    res.json({ site: updated });
  } catch (err) {
    console.error("[sitesApi] PATCH /:id:", err);
    res.status(500).json({ error: "Failed to update site" });
  }
});

// ── List articles for a site ──────────────────────────────────────────────────
router.get("/:id/articles", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid site ID" });

    const articles = await getArticlesBySiteId(id);
    res.json({ articles });
  } catch (err) {
    console.error("[sitesApi] GET /:id/articles:", err);
    res.status(500).json({ error: "Failed to fetch articles" });
  }
});

// ── Update article content and SEO fields ────────────────────────────────────
router.patch("/:id/articles/:articleId", async (req: Request, res: Response) => {
  try {
    const siteId = parseInt(req.params.id, 10);
    const articleId = parseInt(req.params.articleId, 10);
    if (isNaN(siteId) || isNaN(articleId)) {
      return res.status(400).json({ error: "Invalid site or article ID" });
    }

    const allowed = [
      "title", "content", "excerpt", "metaDescription",
      "canonicalUrl", "ogImageUrl", "thumbnail", "altText",
      "dateModified",
    ];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    // Always update dateModified on save
    updates.dateModified = new Date().toISOString().slice(0, 10);

    const updated = await updateArticle(articleId, updates);
    if (!updated) return res.status(404).json({ error: "Article not found" });

    res.json({ article: updated });
  } catch (err) {
    console.error("[sitesApi] PATCH /:id/articles/:articleId:", err);
    res.status(500).json({ error: "Failed to update article" });
  }
});

// ── Get deploy history ────────────────────────────────────────────────────────
router.get("/:id/deploys", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid site ID" });

    const deploys = await getDeploysBySiteId(id);
    res.json({ deploys });
  } catch (err) {
    console.error("[sitesApi] GET /:id/deploys:", err);
    res.status(500).json({ error: "Failed to fetch deploys" });
  }
});

export const sitesApiHandler = router;
