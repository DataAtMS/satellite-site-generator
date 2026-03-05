/**
 * Image generation route for article thumbnails.
 * Uses the Manus Forge image API (same service as imageGeneration.ts in the main app).
 * Streams progress via SSE so the UI can show per-article status.
 */
import type { Request, Response } from "express";
import { storagePut } from "../storage.js";

interface ArticleImageRequest {
  topicId: string;
  title: string;
  altText: string;
  categoryLabel: string;
}

interface ImageResult {
  topicId: string;
  url: string | null;
  error?: string;
}

async function generateOneImage(
  article: ArticleImageRequest,
  forgeApiUrl: string,
  forgeApiKey: string
): Promise<string> {
  // Build a visual prompt from the article's altText (already descriptive) plus style guidance
  const prompt = `${article.altText}. Style: professional editorial photography, dark moody background, high contrast, cinematic lighting, suitable for a dark-themed tech/marketing blog. No text overlays. 16:9 aspect ratio.`;

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

  const buffer = Buffer.from(result.image.b64Json, "base64");
  const slug = article.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  const { url } = await storagePut(
    `thumbnails/${slug}-${Date.now()}.png`,
    buffer,
    result.image.mimeType || "image/png"
  );

  return url;
}

export async function generateImagesHandler(req: Request, res: Response) {
  const { articles } = req.body as { articles: ArticleImageRequest[] };

  if (!articles?.length) {
    return res.status(400).json({ error: "Missing articles array" });
  }

  const forgeApiUrl = process.env.BUILT_IN_FORGE_API_URL;
  const forgeApiKey = process.env.BUILT_IN_FORGE_API_KEY;

  if (!forgeApiUrl || !forgeApiKey) {
    return res.status(503).json({ error: "Image generation API not configured" });
  }

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
  for (const article of articles) {
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
