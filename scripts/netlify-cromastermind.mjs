/**
 * netlify-cromastermind.mjs
 * Triggers Netlify deploy for cromastermind (site id=2, owner=DataAtMS, repo=cromastermind)
 */

const BASE = "http://localhost:5173";

async function main() {
  console.log("Triggering Netlify deploy for cromastermind...\n");

  const res = await fetch(`${BASE}/api/deploy-to-netlify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      siteId: 2,
      owner: "DataAtMS",
      repo: "cromastermind",
    }),
  });

  const reader = res.body.getReader();
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
        } else if (msg.type === "netlify_complete") {
          console.log("\n🎉 NETLIFY DEPLOY COMPLETE!");
          console.log("Live URL:", msg.netlifyUrl);
          console.log("Status:", msg.status);
          console.log("Netlify Site ID:", msg.netlifySiteId);
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
