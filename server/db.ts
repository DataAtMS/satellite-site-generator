import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema.js";

type DbType = MySql2Database<typeof schema>;

let _db: DbType | null = null;

function getDb(): DbType {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const pool = mysql.createPool(url);
  _db = drizzle(pool, { schema, mode: "default" }) as unknown as DbType;
  return _db;
}

export const db = new Proxy({} as DbType, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  },
});

// ─── Site helpers ─────────────────────────────────────────────────────────────

import {
  generatedSites,
  siteCategories,
  siteArticles,
  siteDeploys,
  type InsertGeneratedSite,
  type InsertSiteCategory,
  type InsertSiteArticle,
  type InsertSiteDeploy,
} from "../drizzle/schema.js";
import { eq, desc } from "drizzle-orm";

export async function createSite(data: InsertGeneratedSite) {
  const [result] = await db.insert(generatedSites).values(data);
  const insertId = (result as any).insertId as number;
  const [site] = await db
    .select()
    .from(generatedSites)
    .where(eq(generatedSites.id, insertId));
  return site;
}

export async function getSiteById(id: number) {
  const [site] = await db
    .select()
    .from(generatedSites)
    .where(eq(generatedSites.id, id));
  return site ?? null;
}

export async function getAllSites() {
  return db.select().from(generatedSites).orderBy(desc(generatedSites.createdAt));
}

export async function updateSite(
  id: number,
  data: Partial<InsertGeneratedSite>
) {
  await db.update(generatedSites).set(data).where(eq(generatedSites.id, id));
  return getSiteById(id);
}

export async function createCategories(
  siteId: number,
  categories: Array<{ label: string; slug: string }>
) {
  if (categories.length === 0) return [];
  const rows: InsertSiteCategory[] = categories.map((c, i) => ({
    siteId,
    label: c.label,
    slug: c.slug,
    sortOrder: i,
  }));
  await db.insert(siteCategories).values(rows);
  return db
    .select()
    .from(siteCategories)
    .where(eq(siteCategories.siteId, siteId));
}

export async function getCategoriesBySiteId(siteId: number) {
  return db
    .select()
    .from(siteCategories)
    .where(eq(siteCategories.siteId, siteId));
}

export async function createArticles(
  siteId: number,
  articles: Array<Omit<InsertSiteArticle, "siteId">>
) {
  if (articles.length === 0) return [];
  const rows: InsertSiteArticle[] = articles.map((a) => ({ ...a, siteId }));
  await db.insert(siteArticles).values(rows);
  return db
    .select()
    .from(siteArticles)
    .where(eq(siteArticles.siteId, siteId));
}

export async function getArticlesBySiteId(siteId: number) {
  return db
    .select()
    .from(siteArticles)
    .where(eq(siteArticles.siteId, siteId));
}

export async function updateArticle(
  id: number,
  data: Partial<InsertSiteArticle>
) {
  await db.update(siteArticles).set(data).where(eq(siteArticles.id, id));
  const [article] = await db
    .select()
    .from(siteArticles)
    .where(eq(siteArticles.id, id));
  return article ?? null;
}

export async function createDeploy(data: InsertSiteDeploy) {
  const [result] = await db.insert(siteDeploys).values(data);
  const insertId = (result as any).insertId as number;
  const [deploy] = await db
    .select()
    .from(siteDeploys)
    .where(eq(siteDeploys.id, insertId));
  return deploy;
}

export async function updateDeploy(
  id: number,
  data: Partial<InsertSiteDeploy>
) {
  await db.update(siteDeploys).set(data).where(eq(siteDeploys.id, id));
}

export async function getDeploysBySiteId(siteId: number) {
  return db
    .select()
    .from(siteDeploys)
    .where(eq(siteDeploys.siteId, siteId))
    .orderBy(desc(siteDeploys.triggeredAt));
}
