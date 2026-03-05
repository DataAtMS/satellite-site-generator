import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { generateTopicsHandler } from "./routes/generateTopics.js";
import { writeArticlesHandler } from "./routes/writeArticles.js";
import { generateSiteHandler } from "./routes/generateSite.js";
import { generateImagesHandler } from "./routes/generateImages.js";
import { deployToGithubHandler } from "./routes/deployToGithub.js";
import { deployToNetlifyHandler } from "./routes/deployToNetlify.js";
import { redeployToGithubHandler } from "./routes/redeployToGithub.js";
import { sitesApiHandler } from "./routes/sitesApi.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// ── Generation pipeline ──────────────────────────────────────────────────────
app.post("/api/generate-topics", generateTopicsHandler);
app.post("/api/write-articles", writeArticlesHandler);
app.post("/api/generate-site", generateSiteHandler);       // ZIP download (legacy)
app.post("/api/generate-images", generateImagesHandler);

// ── Live deploy pipeline ─────────────────────────────────────────────────────
app.post("/api/deploy-to-github", deployToGithubHandler);   // Create repo + push files
app.post("/api/deploy-to-netlify", deployToNetlifyHandler); // Link repo to Netlify
app.post("/api/redeploy", redeployToGithubHandler);         // Push content updates

// ── Sites management API ─────────────────────────────────────────────────────
app.use("/api/sites", sitesApiHandler);

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  const clientDist = path.resolve(__dirname, "../dist/client");
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`[server] Generator API running on port ${PORT}`);
});
