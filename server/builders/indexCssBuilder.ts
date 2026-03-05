interface SiteConfig {
  accentColor: string;
}

export function buildIndexCss(siteConfig: SiteConfig): string {
  // Compute a muted link color from the accent
  const accent = siteConfig.accentColor;
  const linkColor = mutedColor(accent);

  return `*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --accent: ${accent};
  --accent-link: ${linkColor};
  --bg: #0a0a0a;
  --bg-card: #0d0d0d;
  --border: #1a1a1a;
  --text-primary: #f0f0f0;
  --text-body: #c8c8c8;
  --text-secondary: #999;
  --text-tertiary: #777;
  --text-faint: #555;
  --mono: 'Space Mono', monospace;
  --serif: Georgia, serif;
}

html, body {
  background: var(--bg);
  color: var(--text-body);
  font-family: var(--mono);
  font-size: 14px;
  line-height: 1.6;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

/* ── Global link reset: kill browser default blue underline everywhere ── */
a {
  color: inherit;
  text-decoration: none;
}

a:hover {
  text-decoration: none;
}

#root {
  min-height: 100vh;
}

/* ── Article content styles ── */
.article-content {
  font-family: var(--serif);
  font-size: 16px;
  line-height: 1.8;
  color: var(--text-body);
}

.article-content h1,
.article-content h2,
.article-content h3,
.article-content h4 {
  font-family: var(--mono);
  color: var(--text-primary);
  margin: 2em 0 0.75em;
  line-height: 1.3;
}

.article-content h1 { font-size: 1.6rem; }
.article-content h2 { font-size: 1.2rem; border-bottom: 1px solid var(--border); padding-bottom: 8px; }
.article-content h3 { font-size: 1rem; color: var(--text-secondary); }

.article-content p {
  margin-bottom: 1.4em;
  color: var(--text-body);
}

.article-content a {
  color: var(--accent-link);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.article-content a:hover {
  color: var(--accent);
}

.article-content strong {
  color: var(--text-primary);
  font-weight: 700;
}

.article-content em {
  font-style: italic;
}

.article-content ul,
.article-content ol {
  margin: 0 0 1.4em 1.5em;
}

.article-content li {
  margin-bottom: 0.5em;
  color: var(--text-body);
}

.article-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.5em 0;
  font-family: var(--mono);
  font-size: 13px;
}

.article-content th,
.article-content td {
  padding: 10px 14px;
  text-align: left;
  border: 1px solid var(--border);
  color: var(--text-body);
}

.article-content th {
  background: #0f0f0f;
  color: var(--text-primary);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.article-content tr:nth-child(even) td {
  background: #0d0d0d;
}

.article-content code {
  font-family: var(--mono);
  font-size: 0.85em;
  background: #111;
  padding: 2px 6px;
  border-radius: 2px;
  color: var(--accent);
}

.article-content blockquote {
  border-left: 3px solid var(--accent);
  margin: 1.5em 0;
  padding: 12px 20px;
  background: #0d0d0d;
  color: var(--text-secondary);
  font-style: italic;
}

/* ── Mobile nav ── */
.hidden-mobile {
  display: flex;
}

.mobile-only {
  display: none;
}

@media (max-width: 640px) {
  .hidden-mobile {
    display: none !important;
  }
  .mobile-only {
    display: flex !important;
  }
}

/* ── TOC sidebar: hidden on mobile, visible on desktop ── */
.toc-sidebar {
  display: none;
}
@media (min-width: 1024px) {
  .toc-sidebar {
    display: block;
  }
}

/* ── Scrollbar ── */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
::-webkit-scrollbar-thumb:hover { background: #444; }
`;
}

function mutedColor(hex: string): string {
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const mr = Math.round(r * 0.7 + 0x22 * 0.3);
    const mg = Math.round(g * 0.7 + 0x22 * 0.3);
    const mb = Math.round(b * 0.7 + 0x22 * 0.3);
    return `#${mr.toString(16).padStart(2, "0")}${mg.toString(16).padStart(2, "0")}${mb.toString(16).padStart(2, "0")}`;
  } catch {
    return hex;
  }
}

/**
 * Compute accessible button text color for a given background color.
 * Uses WCAG relative luminance formula to pick #0a0a0a (dark) or #f0f0f0 (light).
 * This prevents white-on-yellow and similar low-contrast failures.
 */
export function getButtonTextColor(hex: string): string {
  try {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    // sRGB linearization
    const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    // WCAG contrast ratio against dark (#0a0a0a, L≈0.001) and light (#f0f0f0, L≈0.878)
    const contrastDark = (L + 0.05) / (0.001 + 0.05);
    const contrastLight = (0.878 + 0.05) / (L + 0.05);
    // Use dark text if it gives better contrast (typically for yellow, lime, cyan, white)
    return contrastDark >= contrastLight ? '#0a0a0a' : '#f0f0f0';
  } catch {
    return '#f0f0f0';
  }
}
