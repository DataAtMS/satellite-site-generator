// Test the two-step image pipeline
// Run with: cd /home/ubuntu/site-generator && npx tsx test_image.ts
import 'dotenv/config';
import sharp from 'sharp';
import { storagePut } from './server/storage.js';

const forgeApiUrl = process.env.BUILT_IN_FORGE_API_URL!;
const forgeApiKey = process.env.BUILT_IN_FORGE_API_KEY!;

function xmlEscape(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function wrapText(text: string, maxChars: number): string[] {
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (!current) { current = word; }
    else if ((current + ' ' + word).length <= maxChars) { current += ' ' + word; }
    else { lines.push(current); current = word; }
  }
  if (current) lines.push(current);
  return lines;
}

function splitTitleForAccent(title: string): { plain: string; accent: string } {
  const stopWords = new Set(['a','an','the','and','or','but','in','on','at','to','for','of','with','by','from','is','are','was','were','how','what','when','where','why','which','your','you','we','our','do','does','did','will','can','should','into','about','as','up','that','this','these','those','its','it']);
  const words = title.split(/\s+/);
  const contentIndices = words.map((w,i)=>({w,i})).filter(({w})=>!stopWords.has(w.toLowerCase().replace(/[^a-z]/g,''))).map(({i})=>i);
  const accentCount = Math.min(2, contentIndices.length);
  const accentStartIdx = contentIndices[contentIndices.length - accentCount];
  return { plain: words.slice(0, accentStartIdx).join(' '), accent: words.slice(accentStartIdx).join(' ') };
}

function buildTextOverlaySvg(title: string, accentColor: string, width: number, height: number): Buffer {
  const { plain, accent } = splitTitleForAccent(title);
  const panelWidth = Math.round(width * 0.55);
  const padding = Math.round(width * 0.05);
  const textWidth = panelWidth - padding * 2;
  const fontSize = Math.max(32, Math.round(width * 0.068));
  const lineHeight = Math.round(fontSize * 1.25);
  const maxCharsPerLine = Math.floor(textWidth / (fontSize * 0.55));
  const plainLines = wrapText(plain, maxCharsPerLine);
  const accentLines = wrapText(accent, maxCharsPerLine);
  const allLines = [...plainLines, ...accentLines];
  const totalTextHeight = allLines.length * lineHeight;
  const startY = Math.round((height - totalTextHeight) / 2) + fontSize;

  let tspans = '';
  let i = 0;
  for (const line of plainLines) {
    const y = startY + i * lineHeight;
    tspans += `<text x="${padding}" y="${y}" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="${fontSize}" fill="white" text-anchor="start">${xmlEscape(line)}</text>`;
    i++;
  }
  for (const line of accentLines) {
    const y = startY + i * lineHeight;
    tspans += `<text x="${padding}" y="${y}" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="${fontSize}" fill="${xmlEscape(accentColor)}" text-anchor="start">${xmlEscape(line)}</text>`;
    i++;
  }

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

const testArticle = {
  title: "How to Track Ecommerce Conversion Funnel Drop-Off Points",
  altText: "Analytics dashboard showing ecommerce funnel with drop-off points highlighted in red, dark background",
  accentColor: "#ff0066",
};

console.log('Generating background image...');
const baseUrl = forgeApiUrl.endsWith('/') ? forgeApiUrl : `${forgeApiUrl}/`;
const fullUrl = new URL('images.v1.ImageService/GenerateImage', baseUrl).toString();

const prompt = `${testArticle.altText}. Style: dark deep-green or dark navy background, professional marketing blog thumbnail, relevant digital illustration or UI screenshot on the RIGHT side of the image, left side kept dark and clear for text overlay. Cinematic lighting, clean editorial aesthetic. No text, no words, no letters anywhere in the image. 16:9 aspect ratio.`;

const response = await fetch(fullUrl, {
  method: 'POST',
  headers: { accept: 'application/json', 'content-type': 'application/json', 'connect-protocol-version': '1', authorization: `Bearer ${forgeApiKey}` },
  body: JSON.stringify({ prompt, original_images: [] }),
});

if (!response.ok) { console.error('API error:', response.status, await response.text()); process.exit(1); }

const result = await response.json() as { image: { b64Json: string; mimeType: string } };
const bgBuffer = Buffer.from(result.image.b64Json, 'base64');
console.log('Background generated, compositing text...');

const bgImage = sharp(bgBuffer);
const { width = 1024, height = 576 } = await bgImage.metadata();
console.log(`Image size: ${width}x${height}`);

const textSvg = buildTextOverlaySvg(testArticle.title, testArticle.accentColor, width, height);
const composited = await bgImage.composite([{ input: textSvg, blend: 'over' }]).png().toBuffer();

// Save locally for inspection
import { writeFileSync } from 'fs';
writeFileSync('/home/ubuntu/test_thumbnail.png', composited);
console.log('Saved to /home/ubuntu/test_thumbnail.png');

// Also upload to CDN
const { url } = await storagePut(`thumbnails/test-${Date.now()}.png`, composited, 'image/png');
console.log('CDN URL:', url);
