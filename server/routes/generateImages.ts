/**
 * Image generation route for article thumbnails.
 * Two-step pipeline:
 *   1. Generate a clean background illustration via the Forge image API (no text)
 *   2. Composite bold title text on top using sharp — crisp, readable, matching the
 *      reference style: dark background, large white title, key words in accent color,
 *      illustration/UI element on the right half.
 */
import type { Request, Response } from "express";
import sharp from "sharp";
import { storagePut } from "../storage.js";

interface ArticleImageRequest {
  topicId: string;
  title: string;
  altText: string;
  categoryLabel: string;
  accentColor?: string; // hex e.g. "#ff0066" — passed from site config
}

interface ImageResult {
  topicId: string;
  url: string | null;
  error?: string;
}

// ─── Text layout helpers ────────────────────────────────────────────────────

/**
 * Split a title into two parts:
 *   - "plain" words (white)
 *   - "accent" words (the most meaningful 1-3 content words, rendered in accent color)
 * Strategy: last 1-3 content words become accent, rest are plain.
 */
function splitTitleForAccent(title: string): { plain: string; accent: string } {
  const stopWords = new Set([
    "a","an","the","and","or","but","in","on","at","to","for","of","with",
    "by","from","is","are","was","were","how","what","when","where","why",
    "which","your","you","we","our","do","does","did","will","can","should",
    "into","about","as","up","that","this","these","those","its","it",
  ]);
  const words = title.split(/\s+/);
  // Find content words (non-stop)
  const contentIndices = words
    .map((w, i) => ({ w, i }))
    .filter(({ w }) => !stopWords.has(w.toLowerCase().replace(/[^a-z]/g, "")))
    .map(({ i }) => i);

  // Pick last 1-3 content words as accent (prefer 2)
  const accentCount = Math.min(2, contentIndices.length);
  const accentStartIdx = contentIndices[contentIndices.length - accentCount];

  const plainWords = words.slice(0, accentStartIdx);
  const accentWords = words.slice(accentStartIdx);

  return {
    plain: plainWords.join(" "),
    accent: accentWords.join(" "),
  };
}

/** Wrap text into lines that fit within maxChars per line */
function wrapText(text: string, maxChars: number): string[] {
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (current.length === 0) {
      current = word;
    } else if ((current + " " + word).length <= maxChars) {
      current += " " + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Escape XML special chars for SVG text */
function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Build an SVG text overlay that covers the LEFT ~55% of the image.
 * Layout matches the reference: large bold white title, accent-colored key words,
 * left-aligned, vertically centered in the left panel.
 */
function buildTextOverlaySvg(
  title: string,
  accentColor: string,
  width: number,
  height: number
): Buffer {
  const { plain, accent } = splitTitleForAccent(title);

  // Text panel is left 55% of image
  const panelWidth = Math.round(width * 0.55);
  const padding = Math.round(width * 0.05);
  const textWidth = panelWidth - padding * 2;

  // Font size: scale with image width, roughly 7% of width for large text
  const fontSize = Math.max(32, Math.round(width * 0.068));
  const lineHeight = Math.round(fontSize * 1.25);
  const maxCharsPerLine = Math.floor(textWidth / (fontSize * 0.55));

  // Wrap plain and accent parts
  const plainLines = wrapText(plain, maxCharsPerLine);
  const accentLines = wrapText(accent, maxCharsPerLine);
  const allLines = [...plainLines, ...accentLines];
  const totalTextHeight = allLines.length * lineHeight;

  // Vertically center the text block
  const startY = Math.round((height - totalTextHeight) / 2) + fontSize;

  // Build SVG tspan elements
  let tspans = "";
  let lineIndex = 0;

  for (const line of plainLines) {
    const y = startY + lineIndex * lineHeight;
    tspans += `<text x="${padding}" y="${y}" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="${fontSize}" fill="white" text-anchor="start">${xmlEscape(line)}</text>`;
    lineIndex++;
  }

  for (const line of accentLines) {
    const y = startY + lineIndex * lineHeight;
    tspans += `<text x="${padding}" y="${y}" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="${fontSize}" fill="${xmlEscape(accentColor)}" text-anchor="start">${xmlEscape(line)}</text>`;
    lineIndex++;
  }

  // Dark gradient overlay on left side for text legibility
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <linearGradient id="leftFade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="black" stop-opacity="0.72"/>
      <stop offset="70%" stop-color="black" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="black" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${panelWidth + Math.round(width * 0.08)}" height="${height}" fill="url(#leftFade)"/>
  ${tspans}
</svg>`;

  return Buffer.from(svg);
}

// ─── Image generation ────────────────────────────────────────────────────────

async function generateOneImage(
  article: ArticleImageRequest,
  forgeApiUrl: string,
  forgeApiKey: string
): Promise<string> {
  const accentColor = article.accentColor || "#22c55e";

  // Step 1: Generate background illustration (no text, right-side focus)
  const prompt = `${article.altText}. Style: dark deep-green or dark navy background, professional marketing blog thumbnail, relevant digital illustration or UI screenshot on the RIGHT side of the image, left side kept dark and clear for text overlay. Cinematic lighting, clean editorial aesthetic. No text, no words, no letters anywhere in the image. 16:9 aspect ratio.`;

  const baseUrl = forgeApiUrl.endsWith("/") ? forgeApiUrl : `${forgeApiUrl}/`;
  const fullUrl = new URL("images.v1.ImageService/GenerateImage", baseUrl).toString();

  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "connect-protocol-version": "1",
      authorization: `Bearer ${forgeApiKey}`,
    },
    body: JSON.stringify({ prompt, original_images: [] }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Image API error (${response.status}): ${detail}`);
  }

  const result = (await response.json()) as {
    image: { b64Json: string; mimeType: string };
  };

  const bgBuffer = Buffer.from(result.image.b64Json, "base64");

  // Step 2: Composite title text on top using sharp
  const bgImage = sharp(bgBuffer);
  const { width = 1024, height = 576 } = await bgImage.metadata();

  const textSvg = buildTextOverlaySvg(article.title, accentColor, width, height);

  const composited = await bgImage
    .composite([{ input: textSvg, blend: "over" }])
    .png()
    .toBuffer();

  // Upload final composited image
  const slug = article.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  const { url } = await storagePut(
    `thumbnails/${slug}-${Date.now()}.png`,
    composited,
    "image/png"
  );

  return url;
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function generateImagesHandler(req: Request, res: Response) {
  const { articles, accentColor } = req.body as {
    articles: ArticleImageRequest[];
    accentColor?: string;
  };

  if (!articles?.length) {
    return res.status(400).json({ error: "Missing articles array" });
  }

  const forgeApiUrl = process.env.BUILT_IN_FORGE_API_URL;
  const forgeApiKey = process.env.BUILT_IN_FORGE_API_KEY;

  if (!forgeApiUrl || !forgeApiKey) {
    return res.status(503).json({ error: "Image generation API not configured" });
  }

  // Inject accentColor into each article request
  const articlesWithAccent = articles.map((a) => ({
    ...a,
    accentColor: a.accentColor || accentColor || "#22c55e",
  }));

  // Use SSE for streaming progress
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const sendEvent = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  sendEvent({ type: "start", total: articles.length });

  const results: ImageResult[] = [];

  // Generate images sequentially to avoid rate limits
  for (const article of articlesWithAccent) {
    sendEvent({
      type: "progress",
      topicId: article.topicId,
      status: "generating",
      message: `Generating image for: "${article.title}"`,
    });

    try {
      const url = await generateOneImage(article, forgeApiUrl, forgeApiKey);
      results.push({ topicId: article.topicId, url });
      sendEvent({
        type: "progress",
        topicId: article.topicId,
        status: "done",
        message: `Image ready: "${article.title}"`,
        url,
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      results.push({ topicId: article.topicId, url: null, error: errMsg });
      sendEvent({
        type: "progress",
        topicId: article.topicId,
        status: "error",
        message: `Image failed for "${article.title}": ${errMsg}`,
      });
    }
  }

  const successCount = results.filter((r) => r.url !== null).length;
  sendEvent({
    type: "complete",
    results,
    successCount,
    errorCount: results.length - successCount,
    message: `Image generation complete: ${successCount}/${articles.length} succeeded.`,
  });

  res.end();
}
