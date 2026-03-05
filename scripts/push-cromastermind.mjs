/**
 * push-cromastermind.mjs
 * Fetches site data from the API and triggers a fresh GitHub deploy
 * for the cromastermind site (id=1).
 */

const BASE = "http://localhost:5173";

async function main() {
  console.log("Fetching site data...");
  const siteRes = await fetch(`${BASE}/api/sites`);
  const { sites } = await siteRes.json();
  const site = sites.find((s) => s.id === 1);
  if (!site) throw new Error("Site id=1 not found");
  console.log("Site:", site.siteName, "| Status:", site.status);

  const articlesRes = await fetch(`${BASE}/api/sites/1/articles`);
  const { articles } = await articlesRes.json();
  console.log("Articles:", articles.length);

  // Build the siteConfig from the stored site data
  const siteConfig = {
    domain: site.domain,
    siteName: site.siteName,
    tagline: site.tagline,
    heroSubtitle: site.heroSubtitle,
    accentColor: site.accentColor,
    partnerName: site.partnerName,
    partnerUrl: site.partnerUrl,
    partnerDescription: site.partnerDescription,
    twitterHandle: site.twitterHandle,
    categories: [],
  };

  // Get categories
  const catsRes = await fetch(`${BASE}/api/sites/1/categories`);
  const catsText = await catsRes.text();
  let categories = [];
  try {
    const catsData = JSON.parse(catsText);
    categories = catsData.categories || [];
  } catch {
    console.log("No categories endpoint — will derive from articles");
    const seen = new Set();
    for (const a of articles) {
      if (!seen.has(a.categorySlug)) {
        seen.add(a.categorySlug);
        categories.push({ label: a.categoryLabel, slug: a.categorySlug });
      }
    }
  }
  siteConfig.categories = categories;
  console.log("Categories:", categories.length);

  // Map articles to the format expected by deployToGithub
  const mappedArticles = articles.map((a) => ({
    topicId: a.slug,
    slug: a.slug,
    title: a.title,
    categorySlug: a.categorySlug,
    categoryLabel: a.categoryLabel,
    metaDescription: a.metaDescription ?? "",
    excerpt: a.excerpt ?? "",
    content: a.content,
    datePublished: a.datePublished ?? "2026-03-05",
    dateModified: a.dateModified ?? "2026-03-05",
    thumbnail: a.thumbnail ?? "",
    altText: a.altText ?? "",
  }));

  console.log("\nTriggering GitHub deploy...\n");

  const deployRes = await fetch(`${BASE}/api/deploy-to-github`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ siteConfig, articles: mappedArticles }),
  });

  // Stream the NDJSON response
  const reader = deployRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        if (msg.type === "log") {
          const icon = msg.level === "success" ? "✓" : msg.level === "error" ? "✗" : msg.level === "warning" ? "⚠" : " ";
          console.log(`${icon} ${msg.message}`);
        } else if (msg.type === "github_complete") {
          console.log("\n🎉 SUCCESS!");
          console.log("GitHub URL:", msg.githubUrl);
          console.log("Site ID:", msg.siteId);
          console.log("Commit:", msg.commitSha?.slice(0, 7));
        } else if (msg.type === "error") {
          console.error("\n❌ ERROR:", msg.message);
          process.exit(1);
        }
      } catch {
        // ignore parse errors
      }
    }
  }
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
