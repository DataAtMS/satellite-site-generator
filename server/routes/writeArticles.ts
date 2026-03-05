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

// Stop words stripped when building keyword-focused slugs (Rule 4: max 5 words, prefer 4)
const SLUG_STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'your', 'you', 'we', 'our', 'their',
  'this', 'that', 'these', 'those', 'it', 'its', 'how', 'what', 'when',
  'where', 'why', 'which', 'who', 'into', 'about', 'as', 'up', 'out',
]);

function slugify(title: string): string {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);

  // Rule 4: slugs are strictly max 4 words.
  // Keep content words first; fill with stop words only if needed to reach 4 words.
  const contentWords = words.filter((w) => !SLUG_STOP_WORDS.has(w));
  const stopWords = words.filter((w) => SLUG_STOP_WORDS.has(w));

  let slugWords: string[];
  if (contentWords.length >= 4) {
    slugWords = contentWords.slice(0, 4);
  } else if (contentWords.length >= 2) {
    slugWords = [...contentWords];
    for (const sw of stopWords) {
      if (slugWords.length >= 4) break;
      slugWords.push(sw);
    }
    slugWords = slugWords.slice(0, 4);
  } else {
    slugWords = words.slice(0, 4);
  }

  return slugWords.join("-");
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
  slugMap: Map<string, string>, // topicId → pre-computed slug
  datePublished: string
): Promise<WrittenArticle> {
  // Build a list of other articles for internal linking using PRE-COMPUTED slugs
  // This is critical: the AI must use these exact slugs, not invent its own
  const otherTopics = allTopics
    .filter((t) => t.id !== topic.id)
    .slice(0, 12)
    .map((t) => `- "${t.title}" → /articles/${slugMap.get(t.id) ?? slugify(t.title)}`)
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

AVAILABLE INTERNAL LINKS — COPY THESE SLUGS EXACTLY, DO NOT INVENT NEW ONES:
${otherTopics || "No other articles yet — skip internal links if none available."}

CATEGORY PAGES (can also link to these):
${categoryPages}

CRITICAL LINK RULE: When linking to other articles, you MUST use the exact slug shown above after /articles/. Do NOT slugify the title yourself. Do NOT invent a longer or shorter slug. Copy the slug character-for-character from the list above.

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

  // Parse JSON - strip any accidental markdown fences
  let text = raw.text.trim();
  text = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "");

  // Sanitize Unicode characters that break JSON.parse
  text = text
    .replace(/\u2014/g, ",")   // em dash -> comma
    .replace(/\u2013/g, "-")   // en dash -> hyphen
    .replace(/\u2018|\u2019/g, "'")  // smart single quotes
    .replace(/\u201c|\u201d/g, '"');  // smart double quotes

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

  // ── Pre-compute slugs for ALL topics BEFORE writing begins ──────────────────
  // Each topic gets a stable slug derived from its title. We pass this map to
  // every article so the AI can copy exact slugs instead of inventing its own.
  const slugMap = new Map<string, string>();
  for (const topic of topics) {
    slugMap.set(topic.id, slugify(topic.title));
  }

  sendEvent({ type: "start", total: topics.length });
  sendEvent({ type: "log", message: `Writing ${topics.length} articles in parallel using Claude Opus...`, level: "info" });
  sendEvent({ type: "log", message: `Pre-computed ${slugMap.size} slugs — AI will use exact slugs for internal links`, level: "info" });

  const results: WrittenArticle[] = [];
  const errors: { topicId: string; error: string }[] = [];

  // Write all articles in parallel
  const promises = topics.map(async (topic, index) => {
    const datePublished = generateDate(index, topics.length);
    sendEvent({ type: "progress", topicId: topic.id, status: "writing", message: `Writing: "${topic.title}"` });

    try {
      const article = await writeOneArticle(topic, siteConfig, topics, slugMap, datePublished);
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
      return {
        topicId: topic.id,
        slug: slugMap.get(topic.id) ?? slugify(topic.title),
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

  // ── Post-generation link repair pass ─────────────────────────────────────────
  // Build the definitive set of valid slugs from what was actually written.
  // Then scan every article for /articles/SLUG links and fix any broken ones
  // using fuzzy matching (Levenshtein distance) as a safety net.
  const validSlugs = new Set(results.map((r) => r.slug));
  let totalFixed = 0;

  for (const article of results) {
    const fixed = repairInternalLinks(article.content, validSlugs);
    if (fixed.count > 0) {
      article.content = fixed.content;
      totalFixed += fixed.count;
    }
  }

  if (totalFixed > 0) {
    sendEvent({ type: "log", message: `Link repair: fixed ${totalFixed} broken internal links across all articles`, level: "success" });
  } else {
    sendEvent({ type: "log", message: `Link check: all internal links are valid`, level: "success" });
  }

  // ── Post-generation content sanitizer (Fixes 8 & 9) ──────────────────────────
  // Removes em dashes, fixes grammar artifacts (stray slashes, double spaces),
  // and strips empty/invalid hrefs from markdown links.
  let totalSanitized = 0;
  for (const article of results) {
    const { content: sanitized, changes } = sanitizeContent(article.content);
    if (changes > 0) {
      article.content = sanitized;
      totalSanitized += changes;
    }
  }
  if (totalSanitized > 0) {
    sendEvent({ type: "log", message: `Content sanitizer: fixed ${totalSanitized} issues (em dashes, grammar, empty links) across all articles`, level: "success" });
  }

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

// ── Link repair utilities ─────────────────────────────────────────────────────

/** Levenshtein distance between two strings */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/** Find the closest valid slug using Levenshtein distance */
function findClosestSlug(broken: string, validSlugs: Set<string>): string | null {
  let best: string | null = null;
  let bestDist = Infinity;
  const maxAllowed = Math.max(8, Math.floor(broken.length * 0.4)); // allow up to 40% edit distance

  for (const valid of validSlugs) {
    // Quick prefix/contains check first (fast path)
    if (valid === broken) return valid;
    if (broken.includes(valid) || valid.includes(broken)) {
      const dist = levenshtein(broken, valid);
      if (dist < bestDist) { bestDist = dist; best = valid; }
      continue;
    }
    const dist = levenshtein(broken, valid);
    if (dist < bestDist && dist <= maxAllowed) { bestDist = dist; best = valid; }
  }
  return best;
}

/**
 * Sanitize article content:
 * - Fix 9: Replace all em dashes (—, &mdash;, \u2014) with commas or context-appropriate alternatives
 * - Fix 8: Remove grammar artifacts (stray slashes mid-word, double spaces, trailing spaces)
 * - Strip empty markdown links [text]() — keep the anchor text, remove the empty href
 */
function sanitizeContent(content: string): { content: string; changes: number } {
  let changes = 0;
  let result = content;

  // Fix 9: Em dashes — replace with comma + space (most natural prose substitute)
  // Handle all variants: Unicode em dash, HTML entity, double hyphen used as em dash
  const emDashPatterns = [
    // " — " (spaced em dash) → ", "
    { re: / \u2014 /g, replacement: ", " },
    // "—" (unspaced em dash) → ", "
    { re: /\u2014/g, replacement: ", " },
    // HTML entity &mdash;
    { re: /&mdash;/g, replacement: ", " },
    // " -- " (double hyphen as em dash) → ", "
    { re: / -- /g, replacement: ", " },
  ];
  for (const { re, replacement } of emDashPatterns) {
    const before = result;
    result = result.replace(re, replacement);
    if (result !== before) changes++;
  }

  // Fix 8: Grammar artifacts
  // Stray slash mid-word (e.g. "conver/sion" → "conversion")
  const beforeSlash = result;
  result = result.replace(/([a-zA-Z])\/([a-zA-Z])/g, "$1$2");
  if (result !== beforeSlash) changes++;

  // Double spaces in prose (but not in code blocks or tables)
  const beforeDoubleSpace = result;
  result = result.replace(/([^\n])  +([^\n])/g, "$1 $2");
  if (result !== beforeDoubleSpace) changes++;

  // Empty markdown links [text]() — keep the text, remove the broken link
  const beforeEmptyLinks = result;
  result = result.replace(/\[([^\]]+)\]\(\s*\)/g, "$1");
  if (result !== beforeEmptyLinks) changes++;

  // Markdown links with only # as href [text](#) — also strip
  const beforeHashLinks = result;
  result = result.replace(/\[([^\]]+)\]\(#\)/g, "$1");
  if (result !== beforeHashLinks) changes++;

  // Clean up comma artifacts: ",, " → ", " (can happen when em dash was before a comma)
  const beforeDoubleComma = result;
  result = result.replace(/, ,/g, ",").replace(/,,/g, ",");
  if (result !== beforeDoubleComma) changes++;

  // Paragraph breaking: split long prose paragraphs (>120 words) into 2 chunks
  // Skip headings, code blocks, tables, and list items
  const beforeParaBreak = result;
  result = breakLongParagraphs(result);
  if (result !== beforeParaBreak) changes++;

  return { content: result, changes };
}

/**
 * Split paragraphs longer than MAX_PARA_WORDS words into two shorter chunks.
 * Only applies to plain prose paragraphs — skips headings, code blocks, tables, lists.
 */
function breakLongParagraphs(content: string): string {
  const MAX_PARA_WORDS = 100; // paragraphs over this word count get split

  // Process block by block (split on blank lines)
  const blocks = content.split(/\n\n+/);
  const processed = blocks.map((block) => {
    const trimmed = block.trim();

    // Skip non-prose blocks
    if (
      trimmed.startsWith("#") ||          // headings
      trimmed.startsWith("```") ||         // code blocks
      trimmed.startsWith("|") ||           // tables
      trimmed.startsWith("-") ||           // unordered lists
      trimmed.startsWith("*") ||           // unordered lists (alt)
      /^\d+\./.test(trimmed) ||            // ordered lists
      trimmed.startsWith(">")              // blockquotes
    ) {
      return block;
    }

    const words = trimmed.split(/\s+/);
    if (words.length <= MAX_PARA_WORDS) return block;

    // Find a sentence boundary near the midpoint to split on
    const mid = Math.floor(words.length / 2);
    // Search for a sentence-ending period within ±20 words of the midpoint
    let splitAt = -1;
    for (let offset = 0; offset <= 20; offset++) {
      const idxAfter = mid + offset;
      const idxBefore = mid - offset;
      if (idxAfter < words.length && words[idxAfter - 1]?.match(/[.!?]$/)) {
        splitAt = idxAfter;
        break;
      }
      if (idxBefore > 0 && words[idxBefore - 1]?.match(/[.!?]$/)) {
        splitAt = idxBefore;
        break;
      }
    }

    // If no sentence boundary found, split at midpoint anyway
    if (splitAt === -1) splitAt = mid;

    const firstHalf = words.slice(0, splitAt).join(" ");
    const secondHalf = words.slice(splitAt).join(" ");
    return `${firstHalf}\n\n${secondHalf}`;
  });

  return processed.join("\n\n");
}

/** Scan article content and replace broken /articles/SLUG links with closest valid slug */
function repairInternalLinks(
  content: string,
  validSlugs: Set<string>
): { content: string; count: number } {
  let count = 0;
  const repaired = content.replace(/\/articles\/([a-z0-9-]+)/g, (match, slug) => {
    if (validSlugs.has(slug)) return match; // already valid
    const closest = findClosestSlug(slug, validSlugs);
    if (closest) {
      count++;
      return `/articles/${closest}`;
    }
    return match; // can't fix, leave as-is
  });
  return { content: repaired, count };
}
