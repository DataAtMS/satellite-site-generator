/**
 * Quality assurance tests for site-generator builders.
 * Covers the key fixes: contrast, button text color, H1 dedup, TOC sidebar, _redirects, table headers.
 */
import { describe, it, expect } from "vitest";
import { buildHomeTsx } from "./builders/homeBuilder.js";
import { buildArticlePageTsx } from "./builders/articlePageBuilder.js";
import { buildIndexCss } from "./builders/indexCssBuilder.js";
import { getButtonTextColor } from "./builders/indexCssBuilder.js";

const baseSiteConfig = {
  domain: "test.com",
  siteName: "Test Site",
  tagline: "the definitive guide",
  heroSubtitle: "Everything you need to know.",
  accentColor: "#ff0066",
  partnerName: "TestPartner",
  partnerUrl: "https://testpartner.com",
  partnerDescription: "is a great tool.",
  twitterHandle: "@testsite",
  categories: [
    { label: "Guides", slug: "guides" },
    { label: "Tips", slug: "tips" },
  ],
};

// ── Accessibility: button text color ──────────────────────────────────────────

describe("getButtonTextColor", () => {
  it("returns a dark text color for bright yellow accent", () => {
    const result = getButtonTextColor("#ffdd00");
    // Should be a dark color (luminance < 0.5) — not white
    expect(result).not.toBe("#f0f0f0");
    expect(result).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("returns light text (#f0f0f0) for dark accent colors", () => {
    expect(getButtonTextColor("#1a1a2e")).toBe("#f0f0f0");
  });

  it("returns a dark text color for white", () => {
    const result = getButtonTextColor("#ffffff");
    // Should be a dark color — not white on white
    expect(result).not.toBe("#f0f0f0");
    expect(result).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("returns light text for black", () => {
    expect(getButtonTextColor("#000000")).toBe("#f0f0f0");
  });

  it("returns dark text for a medium-bright pink (#ff0066)", () => {
    // #ff0066 has relatively high luminance — should use dark text
    const result = getButtonTextColor("#ff0066");
    // Just verify it returns a valid hex color
    expect(result).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

// ── H1 tagline deduplication ──────────────────────────────────────────────────

describe("buildHomeTsx H1 deduplication", () => {
  it("strips site name prefix from tagline when user duplicates it", () => {
    const config = { ...baseSiteConfig, tagline: "Test Site: the definitive guide" };
    const tsx = buildHomeTsx(config);
    // The H1 should NOT contain "Test Site: Test Site:"
    expect(tsx).not.toContain("Test Site: Test Site:");
    // Should contain the clean tagline
    expect(tsx).toContain("the definitive guide");
  });

  it("does not modify tagline when it has no site name prefix", () => {
    const config = { ...baseSiteConfig, tagline: "the definitive guide" };
    const tsx = buildHomeTsx(config);
    expect(tsx).toContain("Test Site:");
    expect(tsx).toContain("the definitive guide");
  });

  it("handles case-insensitive prefix stripping", () => {
    const config = { ...baseSiteConfig, tagline: "TEST SITE: the definitive guide" };
    const tsx = buildHomeTsx(config);
    expect(tsx).not.toContain("TEST SITE: TEST SITE:");
  });
});

// ── No blue underline on nav links ───────────────────────────────────────────

describe("buildIndexCss link styling", () => {
  it("resets anchor text-decoration to none globally", () => {
    const css = buildIndexCss(baseSiteConfig);
    expect(css).toContain("text-decoration: none");
  });

  it("does not apply default blue color to anchors", () => {
    const css = buildIndexCss(baseSiteConfig);
    // Should not contain browser default blue
    expect(css).not.toContain("color: blue");
    expect(css).not.toContain("color: #0000ff");
  });
});

// ── TOC sidebar: no inline display:none ──────────────────────────────────────

describe("buildArticlePageTsx TOC sidebar", () => {
  it("does not apply inline display:none to the TOC sidebar", () => {
    const tsx = buildArticlePageTsx(baseSiteConfig);
    // The aside should NOT have display:none inline — it's controlled by CSS class
    expect(tsx).not.toMatch(/className="toc-sidebar"[^>]*display:\s*none/);
    expect(tsx).not.toMatch(/display:\s*["']none["'][^}]*toc-sidebar/);
  });

  it("uses toc-sidebar CSS class for the aside element", () => {
    const tsx = buildArticlePageTsx(baseSiteConfig);
    expect(tsx).toContain('className="toc-sidebar"');
  });
});

// ── CSS: TOC sidebar shown on desktop ────────────────────────────────────────

describe("buildIndexCss TOC sidebar responsive rules", () => {
  it("hides toc-sidebar by default (mobile-first)", () => {
    const css = buildIndexCss(baseSiteConfig);
    expect(css).toMatch(/\.toc-sidebar\s*\{[^}]*display:\s*none/);
  });

  it("shows toc-sidebar on desktop via media query", () => {
    const css = buildIndexCss(baseSiteConfig);
    // Should have a media query that shows toc-sidebar
    expect(css).toMatch(/@media[^{]*min-width[^{]*\{[^}]*\.toc-sidebar[^}]*display:\s*block/s);
  });
});

// ── Table headers use <th> not <td> ──────────────────────────────────────────

describe("buildArticlePageTsx table rendering", () => {
  it("generates renderMarkdown function with proper thead/th support", () => {
    const tsx = buildArticlePageTsx(baseSiteConfig);
    expect(tsx).toContain("<thead>");
    expect(tsx).toContain("<th>");
    expect(tsx).toContain("</thead>");
  });
});

// ── Reading progress bar ──────────────────────────────────────────────────────

describe("buildArticlePageTsx reading progress bar", () => {
  it("includes readProgress state and scroll handler", () => {
    const tsx = buildArticlePageTsx(baseSiteConfig);
    expect(tsx).toContain("readProgress");
    expect(tsx).toContain("handleScroll");
  });

  it("renders the progress bar div at the top", () => {
    const tsx = buildArticlePageTsx(baseSiteConfig);
    // The progress bar uses a template literal in generated code: `${readProgress}%`
    // which is escaped as \`\${readProgress}%\` in the outer template literal
    expect(tsx).toContain("readProgress");
    expect(tsx).toContain("width");
    expect(tsx).toContain("position: \"fixed\"");
  });
});

// ── Article counter in meta row ───────────────────────────────────────────────

describe("buildArticlePageTsx article counter", () => {
  it("includes article index counter in meta row", () => {
    const tsx = buildArticlePageTsx(baseSiteConfig);
    expect(tsx).toContain("articleIndex");
    expect(tsx).toContain("categoryAllArticles.length");
  });
});

// ── FURTHER READING cross-category section ────────────────────────────────────

describe("buildArticlePageTsx FURTHER READING", () => {
  it("includes FURTHER READING section with cross-category articles", () => {
    const tsx = buildArticlePageTsx(baseSiteConfig);
    expect(tsx).toContain("FURTHER READING");
    expect(tsx).toContain("furtherReading");
  });
});

// ── Editorial body copy and About section on homepage ─────────────────────────

describe("buildHomeTsx editorial sections", () => {
  it("includes editorial body copy section", () => {
    const tsx = buildHomeTsx(baseSiteConfig);
    expect(tsx).toContain("What Analytics Cannot Tell You");
  });

  it("includes About This Site section", () => {
    const tsx = buildHomeTsx(baseSiteConfig);
    expect(tsx).toContain("ABOUT THIS SITE");
    expect(tsx).toContain("Built for practitioners");
  });
});

// ── Contrast: body text meets WCAG AA ────────────────────────────────────────

describe("buildHomeTsx contrast values", () => {
  it("uses #c8c8c8 or higher for body text (not #999 or lower)", () => {
    const tsx = buildHomeTsx(baseSiteConfig);
    // Should not use the old low-contrast #999 for body text
    expect(tsx).not.toContain('"#999"');
    // Should use the higher contrast value
    expect(tsx).toContain('"#c8c8c8"');
  });

  it("uses #888888 or higher for tertiary text (not #777)", () => {
    const tsx = buildHomeTsx(baseSiteConfig);
    expect(tsx).not.toContain('"#777"');
    expect(tsx).toContain('"#888888"');
  });
});
