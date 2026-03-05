/**
 * redeploy-cromastermind.mjs
 * Pushes the fixed articles from DB (site id=2) to the existing
 * DataAtMS/cromastermind GitHub repo using the /api/redeploy endpoint.
 * The endpoint reads all data from DB directly.
 */

const BASE = "http://localhost:3001";

async function main() {
  console.log("Triggering GitHub redeploy for site id=2 (cromastermind)...\n");

  const deployRes = await fetch(`${BASE}/api/redeploy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      siteId: 2,
      message: "Fix: repair broken internal links across all articles",
    }),
  });

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
          console.log("Commit:", msg.commitSha?.slice(0, 7));
        } else if (msg.type === "error") {
          console.error("\n❌ ERROR:", msg.message);
          process.exit(1);
        }
      } catch { /* ignore */ }
    }
  }
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
