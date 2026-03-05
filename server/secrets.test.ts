import { describe, it, expect } from "vitest";

describe("GitHub PAT validation", () => {
  it("should authenticate with GitHub API", async () => {
    const token = process.env.GITHUB_PAT;
    expect(token, "GITHUB_PAT must be set").toBeTruthy();

    const res = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "site-generator",
        Accept: "application/vnd.github+json",
      },
    });

    expect(res.status, `GitHub API returned ${res.status}`).toBe(200);
    const data = (await res.json()) as { login: string };
    expect(data.login, "GitHub user login should be present").toBeTruthy();
    console.log(`GitHub authenticated as: ${data.login}`);
  });
});

describe("Netlify PAT validation", () => {
  it("should authenticate with Netlify API", async () => {
    const token = process.env.NETLIFY_PAT;
    expect(token, "NETLIFY_PAT must be set").toBeTruthy();

    const res = await fetch("https://api.netlify.com/api/v1/user", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(res.status, `Netlify API returned ${res.status}`).toBe(200);
    const data = (await res.json()) as { email: string };
    expect(data.email, "Netlify user email should be present").toBeTruthy();
    console.log(`Netlify authenticated as: ${data.email}`);
  });
});
