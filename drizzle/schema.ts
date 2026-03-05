import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  json,
  bigint,
} from "drizzle-orm/mysql-core";

// ─── Generated Sites ──────────────────────────────────────────────────────────
// One row per site produced by the generator.
export const generatedSites = mysqlTable("generated_sites", {
  id: int("id").autoincrement().primaryKey(),
  /** GitHub username or org that owns the repo */
  githubOwner: varchar("githubOwner", { length: 128 }).notNull(),
  /** GitHub repo name, e.g. "cro-hacks" */
  githubRepo: varchar("githubRepo", { length: 128 }).notNull(),
  /** Full GitHub repo URL */
  githubUrl: text("githubUrl"),
  /** Netlify site ID returned from the API */
  netlifySiteId: varchar("netlifySiteId", { length: 64 }),
  /** Live Netlify URL, e.g. https://cro-hacks.netlify.app */
  netlifyUrl: text("netlifyUrl"),
  /** Custom domain if assigned */
  domain: varchar("domain", { length: 256 }),
  /** Human-readable site name */
  siteName: varchar("siteName", { length: 256 }).notNull(),
  /** Tagline used in H1 */
  tagline: text("tagline"),
  /** Hero subtitle paragraph */
  heroSubtitle: text("heroSubtitle"),
  /** Accent hex color, e.g. #ff0066 */
  accentColor: varchar("accentColor", { length: 16 }).notNull().default("#ff0066"),
  /** Partner/sponsor name */
  partnerName: varchar("partnerName", { length: 256 }),
  /** Partner URL */
  partnerUrl: text("partnerUrl"),
  /** Partner description sentence */
  partnerDescription: text("partnerDescription"),
  /** Twitter handle, e.g. @mysite */
  twitterHandle: varchar("twitterHandle", { length: 64 }),
  /** Deploy status: pending | deploying | live | failed */
  status: mysqlEnum("status", ["pending", "deploying", "live", "failed"])
    .notNull()
    .default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastDeployedAt: timestamp("lastDeployedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GeneratedSite = typeof generatedSites.$inferSelect;
export type InsertGeneratedSite = typeof generatedSites.$inferInsert;

// ─── Site Categories ──────────────────────────────────────────────────────────
export const siteCategories = mysqlTable("site_categories", {
  id: int("id").autoincrement().primaryKey(),
  siteId: int("siteId").notNull(),
  label: varchar("label", { length: 128 }).notNull(),
  slug: varchar("slug", { length: 128 }).notNull(),
  sortOrder: int("sortOrder").notNull().default(0),
});

export type SiteCategory = typeof siteCategories.$inferSelect;
export type InsertSiteCategory = typeof siteCategories.$inferInsert;

// ─── Site Articles ────────────────────────────────────────────────────────────
export const siteArticles = mysqlTable("site_articles", {
  id: int("id").autoincrement().primaryKey(),
  siteId: int("siteId").notNull(),
  /** URL slug, e.g. "how-to-use-scroll-maps" */
  slug: varchar("slug", { length: 256 }).notNull(),
  /** Article title */
  title: text("title").notNull(),
  /** Category slug this article belongs to */
  categorySlug: varchar("categorySlug", { length: 128 }).notNull(),
  /** Category display label */
  categoryLabel: varchar("categoryLabel", { length: 128 }).notNull(),
  /** Primary SEO keyword */
  targetKeyword: varchar("targetKeyword", { length: 256 }),
  /** Full markdown article content */
  content: text("content").notNull(),
  /** Meta description (max 160 chars) */
  metaDescription: varchar("metaDescription", { length: 320 }),
  /** Short excerpt shown in article cards */
  excerpt: text("excerpt"),
  /** Alt text for the thumbnail image */
  altText: text("altText"),
  /** Thumbnail image URL (CDN or generated) */
  thumbnail: text("thumbnail"),
  /** Canonical URL override */
  canonicalUrl: text("canonicalUrl"),
  /** OG image URL */
  ogImageUrl: text("ogImageUrl"),
  /** ISO date string, e.g. 2026-03-01 */
  datePublished: varchar("datePublished", { length: 16 }),
  dateModified: varchar("dateModified", { length: 16 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SiteArticle = typeof siteArticles.$inferSelect;
export type InsertSiteArticle = typeof siteArticles.$inferInsert;

// ─── Site Deploys ─────────────────────────────────────────────────────────────
// History of every deploy triggered for a site.
export const siteDeploys = mysqlTable("site_deploys", {
  id: int("id").autoincrement().primaryKey(),
  siteId: int("siteId").notNull(),
  /** GitHub commit SHA */
  commitSha: varchar("commitSha", { length: 64 }),
  /** Netlify deploy ID */
  netlifyDeployId: varchar("netlifyDeployId", { length: 64 }),
  /** Commit message / deploy description */
  message: text("message"),
  /** pending | building | ready | failed */
  status: mysqlEnum("status", ["pending", "building", "ready", "failed"])
    .notNull()
    .default("pending"),
  triggeredAt: timestamp("triggeredAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type SiteDeploy = typeof siteDeploys.$inferSelect;
export type InsertSiteDeploy = typeof siteDeploys.$inferInsert;
