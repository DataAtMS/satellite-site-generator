import type { Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Load writing rule files once at startup
let WRITING_RULES_CONTENT = "";
let WRITING_RULES_SEO = "";
try {
  WRITING_RULES_CONTENT = readFileSync(
    path.resolve(__dirname, "../../WRITING_RULES_CONTENT.md"),
    "utf-8"
  );
  WRITING_RULES_SEO = readFileSync(
    path.resolve(__dirname, "../../WRITING_RULES_SEO.md"),
    "utf-8"
  );
} catch (e) {
  console.warn("[writeArticles] Could not load writing rules files:", e);
}

interface SiteConfig {
  domain: string;
  siteName: string;
  tagline: string;
  accentColor: string;
  partnerName: string;
  partnerUrl: string;
  partnerDescription: string;
  twitterHandle: string;
  categories: { label: string; slug: string }[];
}

interface TopicIdea {
  id: string;
  title: string;
  angle: string;
  targetKeyword: string;
  categorySlug: string;
  categoryLabel: string;
}

interface WrittenArticle {
  topicId: string;
  slug: string;
  title: string;
  categorySlug: string;
  categoryLabel: string;
  targetKeyword: string;
  content: string;
  metaDescription: string;
  excerpt: string;
  altText: string;
  thumbnail: string;
  datePublished: string;
  dateModified: string;
  status: "done" | "error";
  error?: string;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function generateDate(index: number, total: number): string {
  // Spread dates over the past 6 weeks, newest first
  const now = new Date();
  const spread = Math.floor((index / Math.max(total - 1, 1)) * 42); // 0–42 days ago
  const d = new Date(now.getTime() - spread * 24 * 60 * 60 * 1000);
  return d.toISOString().split("T")[0];
}

async function writeOneArticle(
  topic: TopicIdea,
  siteConfig: SiteConfig,
  allTopics: TopicIdea[],
  datePublished: string
): Promise<WrittenArticle> {
  // Build a list of other articles for internal linking
  const otherTopics = allTopics
    .filter((t) => t.id !== topic.id)
    .slice(0, 8)
    .map((t) => `- "${t.title}" → /articles/${slugify(t.title)}`)
    .join("\n");

  const categoryPages = siteConfig.categories
    .map((c) => `- ${c.label} → /${c.slug}`)
    .join("\n");

  const systemPrompt = `You are a world-class SEO content writer and 20-year veteran practitioner. You write long-form, genuinely useful articles that rank on Google and are worth reading by humans.

WRITING RULES (FOLLOW EXACTLY):
${WRITING_RULES_CONTENT}

SEO RULES (FOLLOW EXACTLY):
${WRITING_RULES_SEO}`;

  const userPrompt = `Write a complete, publish-ready article for the following topic.

SITE CONTEXT:
- Site Name: ${siteConfig.siteName}
- Domain: ${siteConfig.domain}
- Partner Tool: ${siteConfig.partnerName} (${siteConfig.partnerUrl}) — ${siteConfig.partnerDescription}
- Category: ${topic.categoryLabel}

ARTICLE TOPIC:
- Title: ${topic.title}
- Target Keyword: ${topic.targetKeyword}
- Editorial Angle: ${topic.angle}

AVAILABLE INTERNAL LINKS (use at least 2):
${otherTopics || "No other articles yet — skip internal links if none available."}

CATEGORY PAGES (can also link to these):
${categoryPages}

REQUIREMENTS:
1. Write 2,000–2,500 words minimum. Long-form, high-value content.
2. Include at least one properly formatted markdown table with a header row and 3+ data rows.
3. Include at least 2 outbound links to reputable external sources (real URLs).
4. Include at least 2 internal links to other articles or category pages listed above.
5. End with a CTA paragraph mentioning ${siteConfig.partnerName} at ${siteConfig.partnerUrl}.
6. Follow ALL writing rules: no em dashes, no banned words, active voice, empathetic opening.

Return a JSON object with EXACTLY this structure (no markdown code fences, raw JSON only):
{
  "title": "The exact article title (under 65 chars, SEO-optimized)",
  "metaDescription": "150-160 char meta description, active voice, includes target keyword",
  "excerpt": "2-3 sentence excerpt for article listings (under 200 chars)",
  "altText": "Descriptive alt text for the article thumbnail image (describe what a relevant image would show)",
  "content": "FULL article markdown content starting with # {title} as H1, minimum 2000 words"
}`;

  const message = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 8192,
    messages: [{ role: "user", content: userPrompt }],
    system: systemPrompt,
  });

  const raw = message.content[0];
  if (raw.type !== "text") throw new Error("Unexpected response type from Claude");

  // Parse JSON — strip any accidental markdown fences
  let text = raw.text.trim();
  text = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "");

  // Find the JSON object
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON object found in response");

  const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));

  return {
    topicId: topic.id,
    slug: slugify(parsed.title || topic.title),
    title: parsed.title || topic.title,
    categorySlug: topic.categorySlug,
    categoryLabel: topic.categoryLabel,
    targetKeyword: topic.targetKeyword,
    content: parsed.content || "",
    metaDescription: parsed.metaDescription || "",
    excerpt: parsed.excerpt || "",
    altText: parsed.altText || `Image illustrating ${topic.title}`,
    thumbnail: "", // populated by the image generation step
    datePublished,
    dateModified: datePublished,
    status: "done",
  };
}

export async function writeArticlesHandler(req: Request, res: Response) {
  const { siteConfig, topics } = req.body as {
    siteConfig: SiteConfig;
    topics: TopicIdea[];
  };

  if (!siteConfig || !topics?.length) {
    return res.status(400).json({ error: "Missing siteConfig or topics" });
  }

  // Use SSE for streaming progress updates
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const sendEvent = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  sendEvent({ type: "start", total: topics.length });
  sendEvent({ type: "log", message: `Writing ${topics.length} articles in parallel using Claude Opus...`, level: "info" });

  const results: WrittenArticle[] = [];
  const errors: { topicId: string; error: string }[] = [];

  // Write all articles in parallel
  const promises = topics.map(async (topic, index) => {
    const datePublished = generateDate(index, topics.length);
    sendEvent({ type: "progress", topicId: topic.id, status: "writing", message: `Writing: "${topic.title}"` });

    try {
      const article = await writeOneArticle(topic, siteConfig, topics, datePublished);
      sendEvent({
        type: "progress",
        topicId: topic.id,
        status: "done",
        message: `Done: "${article.title}" (${article.content.split(" ").length} words)`,
      });
      return article;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      sendEvent({
        type: "progress",
        topicId: topic.id,
        status: "error",
        message: `Error writing "${topic.title}": ${errMsg}`,
      });
      errors.push({ topicId: topic.id, error: errMsg });
      // Return a placeholder so the flow can continue
      return {
        topicId: topic.id,
        slug: slugify(topic.title),
        title: topic.title,
        categorySlug: topic.categorySlug,
        categoryLabel: topic.categoryLabel,
        targetKeyword: topic.targetKeyword,
        content: `# ${topic.title}\n\n*Article generation failed: ${errMsg}*`,
        metaDescription: `Learn about ${topic.targetKeyword}.`,
        excerpt: `An article about ${topic.title}.`,
        altText: `Image illustrating ${topic.title}`,
        thumbnail: "",
        datePublished,
        dateModified: datePublished,
        status: "error" as const,
        error: errMsg,
      };
    }
  });

  const settled = await Promise.all(promises);
  results.push(...settled);

  const successCount = results.filter((r) => r.status === "done").length;
  sendEvent({
    type: "complete",
    articles: results,
    successCount,
    errorCount: errors.length,
    message: `Completed: ${successCount}/${topics.length} articles written successfully.`,
  });

  res.end();
}
