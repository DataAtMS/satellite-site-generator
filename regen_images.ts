// Run with: cd /home/ubuntu/site-generator && npx tsx regen_images.ts
import 'dotenv/config';
import { storagePut } from './server/storage.js';
import { updateArticle } from './server/db.js';

const SITE_ID = 30001;
const forgeApiUrl = process.env.BUILT_IN_FORGE_API_URL;
const forgeApiKey = process.env.BUILT_IN_FORGE_API_KEY;

if (!forgeApiUrl || !forgeApiKey) {
  console.error('Missing BUILT_IN_FORGE_API_URL or BUILT_IN_FORGE_API_KEY');
  process.exit(1);
}

// Fetch articles from local API
const res = await fetch(`http://localhost:3001/api/sites/${SITE_ID}`);
const data = await res.json() as any;
const articles = data.articles as any[];
console.log(`Found ${articles.length} articles`);

function shortDisplayTitle(title: string): string {
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'how', 'what',
    'when', 'where', 'why', 'which', 'your', 'you', 'we', 'our', 'do',
    'does', 'did', 'will', 'can', 'should', 'into', 'about', 'as', 'up',
  ]);
  const words = title.split(/\s+/);
  const contentWords = words.filter((w) => !stopWords.has(w.toLowerCase()));
  const selected = contentWords.length >= 3 ? contentWords.slice(0, 4) : words.slice(0, 4);
  return selected.join(' ');
}

async function generateImage(article: any): Promise<string> {
  const displayTitle = shortDisplayTitle(article.title);
  const prompt = `${article.altText}. Style: dark moody digital analytics aesthetic, cinematic lighting, deep navy or charcoal background, glowing UI elements, data visualization screens, professional tech/marketing editorial. 16:9 aspect ratio. No text in the image.`;

  const baseUrl = forgeApiUrl!.endsWith('/') ? forgeApiUrl! : `${forgeApiUrl}/`;
  const fullUrl = new URL('images.v1.ImageService/GenerateImage', baseUrl).toString();

  const response = await fetch(fullUrl, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'connect-protocol-version': '1',
      authorization: `Bearer ${forgeApiKey}`,
    },
    body: JSON.stringify({ prompt, original_images: [] }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Image API error (${response.status}): ${detail}`);
  }

  const result = await response.json() as { image: { b64Json: string; mimeType: string } };
  const buffer = Buffer.from(result.image.b64Json, 'base64');
  const slug = article.slug || article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);
  const { url } = await storagePut(
    `thumbnails/${slug}-${Date.now()}.png`,
    buffer,
    result.image.mimeType || 'image/png'
  );
  return url;
}

let success = 0;
let failed = 0;

for (let i = 0; i < articles.length; i++) {
  const article = articles[i];
  console.log(`[${i + 1}/${articles.length}] Generating: "${article.title}"`);
  try {
    const url = await generateImage(article);
    await updateArticle(article.id, { thumbnail: url });
    console.log(`  ✓ Done: ${url.slice(0, 60)}...`);
    success++;
  } catch (err: any) {
    console.error(`  ✗ Failed: ${err.message}`);
    failed++;
  }
  // Small delay to avoid rate limits
  await new Promise(r => setTimeout(r, 1000));
}

console.log(`\nDone: ${success} succeeded, ${failed} failed`);
