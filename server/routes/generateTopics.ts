import type { Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

interface TopicIdea {
  id: string;
  title: string;
  angle: string;
  targetKeyword: string;
  categorySlug: string;
  categoryLabel: string;
  selected: boolean;
}

export async function generateTopicsHandler(req: Request, res: Response) {
  const { siteConfig, topicsPerCategory = 5 } = req.body as {
    siteConfig: SiteConfig;
    topicsPerCategory: number;
  };

  if (!siteConfig || !siteConfig.categories?.length) {
    return res.status(400).json({ error: "Invalid site config" });
  }

  const categoryList = siteConfig.categories
    .map((c) => `- ${c.label} (slug: ${c.slug})`)
    .join("\n");

  const prompt = `You are an expert SEO content strategist. Generate article topic ideas for a new content site.

SITE DETAILS:
- Site Name: ${siteConfig.siteName}
- Domain: ${siteConfig.domain}
- Tagline: ${siteConfig.tagline}
- Partner/Tool: ${siteConfig.partnerName} (${siteConfig.partnerUrl})

CATEGORIES:
${categoryList}

TASK:
Generate exactly ${topicsPerCategory} article topic ideas for EACH category listed above. Total: ${topicsPerCategory * siteConfig.categories.length} topics.

REQUIREMENTS FOR EACH TOPIC:
1. Title: Specific, actionable, SEO-optimized (under 65 chars). Use "How to", "Why", "What", numbers, or specific scenarios. NO em dashes.
2. Angle: 1-2 sentences describing the unique editorial angle — what makes this article different and valuable. NO em dashes.
3. Target keyword: The primary long-tail keyword phrase (3-5 words) this article should rank for.

RULES:
- Topics must be genuinely useful and specific, not generic
- Each topic should be distinct — no overlap between topics in the same category
- Target keywords should be realistic long-tail phrases with commercial/informational intent
- Avoid banned words: amazing, leverage, delve, utilize, crucial, vital, transformative, game-changer, revolutionary, cutting-edge, state-of-the-art, best practices, seamlessly, robust, comprehensive, holistic, synergy, paradigm shift
- Write for operators and practitioners, not beginners

Return a JSON array with this exact structure:
{
  "topics": [
    {
      "id": "unique-id-string",
      "title": "Article Title Here",
      "angle": "The specific angle and value proposition of this article.",
      "targetKeyword": "target keyword phrase",
      "categorySlug": "category-slug",
      "categoryLabel": "Category Label",
      "selected": true
    }
  ]
}`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      return res.status(500).json({ error: "Unexpected response type from Claude" });
    }

    // Extract JSON from the response
    const text = content.text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: "Could not parse JSON from Claude response" });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const topics: TopicIdea[] = parsed.topics.map((t: TopicIdea, idx: number) => ({
      ...t,
      id: t.id || `topic-${idx}-${Date.now()}`,
      selected: true,
    }));

    return res.json({ topics });
  } catch (err: unknown) {
    console.error("[generateTopics] Error:", err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to generate topics",
    });
  }
}
