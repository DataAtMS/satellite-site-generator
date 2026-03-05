/**
 * repair-links-cromastermind.mjs
 * Fixes broken internal links in cromastermind articles (site id=2).
 *
 * Strategy:
 * 1. Exact match (no-op)
 * 2. Contains match (one slug contains the other)
 * 3. Word-overlap Jaccard similarity (best for "why-sequential-ab-tests-give-you-false-winners"
 *    vs "ab-testing-bias" — they share "ab" and "test" stems)
 * 4. Levenshtein as final fallback
 */

const BASE = "http://localhost:3001";

// Stop words to ignore when computing word overlap
const STOP = new Set(["the", "a", "an", "and", "or", "for", "to", "of", "in", "on",
  "at", "by", "with", "how", "why", "what", "when", "where", "is", "are", "does",
  "do", "your", "you", "vs", "vs.", "that", "this", "it", "its", "from", "about"]);

function slugWords(slug) {
  return new Set(
    slug.split("-")
      .map(w => w.replace(/s$/, "")) // simple stemming: strip trailing 's'
      .filter(w => w.length > 2 && !STOP.has(w))
  );
}

function jaccardSimilarity(a, b) {
  const setA = slugWords(a);
  const setB = slugWords(b);
  let intersection = 0;
  for (const w of setA) if (setB.has(w)) intersection++;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
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

function findClosestSlug(broken, validSlugs) {
  // 1. Exact
  if (validSlugs.has(broken)) return broken;

  // 2. Contains (one is a substring of the other)
  for (const valid of validSlugs) {
    if (broken.includes(valid) || valid.includes(broken)) return valid;
  }

  // 3. Word-overlap Jaccard (primary method for semantically similar slugs)
  let bestJaccard = 0;
  let bestJaccardSlug = null;
  for (const valid of validSlugs) {
    const sim = jaccardSimilarity(broken, valid);
    if (sim > bestJaccard) { bestJaccard = sim; bestJaccardSlug = valid; }
  }
  // Accept if at least 1 meaningful word in common (Jaccard > 0)
  if (bestJaccard > 0) return bestJaccardSlug;

  // 4. Levenshtein fallback (for short slugs with typos)
  let bestDist = Infinity;
  let bestDistSlug = null;
  const maxAllowed = Math.max(6, Math.floor(broken.length * 0.35));
  for (const valid of validSlugs) {
    const dist = levenshtein(broken, valid);
    if (dist < bestDist && dist <= maxAllowed) { bestDist = dist; bestDistSlug = valid; }
  }
  return bestDistSlug;
}

function repairContent(content, validSlugs) {
  const fixes = [];
  const repaired = content.replace(/\/articles\/([a-z0-9-]+)/g, (match, slug) => {
    if (validSlugs.has(slug)) return match;
    const closest = findClosestSlug(slug, validSlugs);
    if (closest) {
      fixes.push({ from: slug, to: closest });
      return `/articles/${closest}`;
    }
    fixes.push({ from: slug, to: null });
    return match;
  });
  return { content: repaired, fixes };
}

async function main() {
  console.log("Fetching cromastermind articles (site id=2)...");
  const res = await fetch(`${BASE}/api/sites/2/articles`);
  const { articles } = await res.json();
  console.log(`Loaded ${articles.length} articles\n`);

  const validSlugs = new Set(articles.map(a => a.slug));
  console.log("Valid slugs:", [...validSlugs].sort().join(", "), "\n");

  let totalFixed = 0;
  let totalUnfixable = 0;
  let articlesFixed = 0;

  for (const article of articles) {
    const { content: fixed, fixes } = repairContent(article.content, validSlugs);
    const fixedLinks = fixes.filter(f => f.to !== null);
    const unfixable = fixes.filter(f => f.to === null);

    if (fixedLinks.length > 0) {
      console.log(`\nArticle: ${article.slug}`);
      for (const f of fixedLinks) console.log(`  FIXED: ${f.from} → ${f.to}`);
      for (const f of unfixable) console.log(`  UNFIXABLE: ${f.from}`);

      const patchRes = await fetch(`${BASE}/api/sites/2/articles/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: fixed }),
      });
      if (!patchRes.ok) {
        console.error(`  ERROR: ${await patchRes.text()}`);
      } else {
        console.log(`  ✓ Saved`);
        totalFixed += fixedLinks.length;
        articlesFixed++;
      }
    } else if (unfixable.length > 0) {
      console.log(`\nArticle: ${article.slug} — ${unfixable.length} unfixable links`);
      for (const f of unfixable) console.log(`  UNFIXABLE: ${f.from}`);
    }
    totalUnfixable += unfixable.length;
  }

  console.log(`\n✓ Done. Fixed ${totalFixed} links across ${articlesFixed} articles.`);
  if (totalUnfixable > 0) console.log(`⚠ ${totalUnfixable} links could not be matched.`);
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
