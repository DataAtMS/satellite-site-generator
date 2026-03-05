/**
 * deployToNetlify.ts
 *
 * Creates a Netlify site linked to an existing GitHub repo.
 * Once linked, every push to the repo's main branch triggers an automatic
 * Netlify build and deploy — no further API calls needed for content updates.
 *
 * Flow:
 *  1. Create a Netlify site with GitHub repo link via the Netlify API
 *  2. Store the netlify_site_id and netlify_url in the DB
 *  3. Return the live URL and deploy status
 */

import type { Request, Response } from "express";
import { getSiteById, updateSite, createDeploy, updateDeploy } from "../db.js";

interface DeployToNetlifyBody {
  siteId: number;
  owner: string;
  repo: string;
}

interface NetlifySiteResponse {
  id: string;
  url: string;
  ssl_url: string;
  name: string;
  deploy_url?: string;
}

interface NetlifyDeployResponse {
  id: string;
  state: string;
  deploy_ssl_url?: string;
  url?: string;
}

function sendLog(
  res: Response,
  message: string,
  level: "info" | "success" | "error" | "warning" = "info"
) {
  res.write(JSON.stringify({ type: "log", message, level }) + "\n");
}

/** Poll Netlify deploy status until ready or failed (max 3 min) */
async function pollDeploy(
  token: string,
  siteId: string,
  maxWaitMs = 180_000
): Promise<{ status: "ready" | "failed"; url: string }> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const res = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys?per_page=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) break;
    const deploys = (await res.json()) as NetlifyDeployResponse[];
    const latest = deploys[0];
    if (!latest) {
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }
    if (latest.state === "ready") {
      return { status: "ready", url: latest.deploy_ssl_url ?? latest.url ?? "" };
    }
    if (latest.state === "error") {
      return { status: "failed", url: "" };
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  return { status: "failed", url: "" };
}

export async function deployToNetlifyHandler(req: Request, res: Response) {
  const { siteId, owner, repo } = req.body as DeployToNetlifyBody;

  if (!siteId || !owner || !repo) {
    return res.status(400).json({ error: "Missing required fields: siteId, owner, repo" });
  }

  const token = process.env.NETLIFY_PAT;
  if (!token) {
    return res.status(500).json({ error: "NETLIFY_PAT is not configured" });
  }

  const githubToken = process.env.GITHUB_PAT;
  if (!githubToken) {
    return res.status(500).json({ error: "GITHUB_PAT is not configured" });
  }

  // Set streaming headers
  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Transfer-Encoding", "chunked");
  res.setHeader("Cache-Control", "no-cache");
  res.flushHeaders();

  let netlifyDeployId: string | null = null;
  let dbDeployId: number | null = null;

  try {
    const site = await getSiteById(siteId);
    if (!site) {
      throw new Error(`Site ${siteId} not found in database`);
    }

    // ── Step 1: Create Netlify site linked to GitHub repo ────────────────────
    sendLog(res, `Creating Netlify site linked to ${owner}/${repo}...`);

    const netlifyBody = {
      name: repo,
      repo: {
        provider: "github",
        repo: `${owner}/${repo}`,
        branch: "main",
        cmd: "pnpm build",
        dir: "dist",
        installation_id: null,
      },
    };

    const createRes = await fetch("https://api.netlify.com/api/v1/sites", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(netlifyBody),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Netlify site creation failed (${createRes.status}): ${errText}`);
    }

    const netlifySite = (await createRes.json()) as NetlifySiteResponse;
    const netlifySiteId = netlifySite.id;
    const netlifyUrl = netlifySite.ssl_url || netlifySite.url;

    sendLog(res, `Netlify site created: ${netlifyUrl}`, "success");
    sendLog(res, `Netlify site ID: ${netlifySiteId}`);

    // ── Step 2: Persist Netlify info to DB ───────────────────────────────────
    await updateSite(siteId, {
      netlifySiteId,
      netlifyUrl,
      status: "deploying",
    });

    const dbDeploy = await createDeploy({
      siteId,
      netlifyDeployId: netlifySiteId,
      message: "Netlify site created and linked to GitHub repo",
      status: "building",
    });
    dbDeployId = dbDeploy.id;
    netlifyDeployId = netlifySiteId;

    sendLog(res, "Waiting for Netlify to build and deploy (this takes ~60 seconds)...");

    // ── Step 3: Poll for deploy completion ───────────────────────────────────
    const { status: deployStatus, url: deployUrl } = await pollDeploy(token, netlifySiteId);

    const finalUrl = deployUrl || netlifyUrl;

    if (deployStatus === "ready") {
      await updateSite(siteId, {
        netlifyUrl: finalUrl,
        status: "live",
        lastDeployedAt: new Date(),
      });
      await updateDeploy(dbDeployId, {
        status: "ready",
        completedAt: new Date(),
      });
      sendLog(res, `Site is live at: ${finalUrl}`, "success");
    } else {
      // Deploy failed but site was created — still usable, just not built yet
      await updateSite(siteId, { status: "deploying" });
      await updateDeploy(dbDeployId, { status: "failed", completedAt: new Date() });
      sendLog(
        res,
        `Build timed out or failed. The site is linked at ${netlifyUrl} — Netlify may still be building.`,
        "warning"
      );
    }

    res.write(
      JSON.stringify({
        type: "netlify_complete",
        siteId,
        netlifySiteId,
        netlifyUrl: finalUrl,
        status: deployStatus,
      }) + "\n"
    );

    res.end();
  } catch (err: unknown) {
    console.error("[deployToNetlify] Error:", err);

    if (dbDeployId) {
      await updateDeploy(dbDeployId, { status: "failed", completedAt: new Date() }).catch(() => {});
    }

    res.write(
      JSON.stringify({
        type: "error",
        message: err instanceof Error ? err.message : "Unknown error during Netlify deploy",
      }) + "\n"
    );
    res.end();
  }
}
