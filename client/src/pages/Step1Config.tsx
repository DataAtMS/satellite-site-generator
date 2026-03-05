import { useState } from "react";
import type { SiteConfig, Category } from "../lib/types";

// ── Accessibility helpers ──────────────────────────────────────────────────
function getLuminance(hex: string): number {
  try {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  } catch { return 0; }
}

function contrastRatio(L1: number, L2: number): number {
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return parseFloat(((lighter + 0.05) / (darker + 0.05)).toFixed(1));
}

/** Returns accessible text color (#0a0a0a or #f0f0f0) for a given button background */
function getContrastTextColor(hex: string): string {
  const L = getLuminance(hex);
  const darkL = getLuminance('#0a0a0a');
  const lightL = getLuminance('#f0f0f0');
  return contrastRatio(L, lightL) >= contrastRatio(L, darkL) ? '#f0f0f0' : '#0a0a0a';
}

/** Checks if button text passes WCAG AA (4.5:1) */
function getContrastRating(accentHex: string): { pass: boolean; ratio: number } {
  const accentL = getLuminance(accentHex);
  const textColor = getContrastTextColor(accentHex);
  const textL = getLuminance(textColor);
  const ratio = contrastRatio(accentL, textL);
  return { pass: ratio >= 4.5, ratio };
}

/** Checks if accent color is readable on #0a0a0a background (3:1 minimum for UI elements) */
function getBodyContrastRating(accentHex: string): { pass: boolean; ratio: number } {
  const accentL = getLuminance(accentHex);
  const bgL = getLuminance('#0a0a0a');
  const ratio = contrastRatio(accentL, bgL);
  return { pass: ratio >= 3.0, ratio };
}

interface Props {
  initialConfig: SiteConfig | null;
  onSubmit: (config: SiteConfig) => void;
}

const PRESET_COLORS = [
  { hex: "#ff0066", label: "Hot Pink (default)" },
  { hex: "#00aaff", label: "Electric Blue" },
  { hex: "#00cc66", label: "Neon Green" },
  { hex: "#ff6600", label: "Orange" },
  { hex: "#aa44ff", label: "Purple" },
  { hex: "#ffcc00", label: "Gold" },
  { hex: "#ff3333", label: "Red" },
  { hex: "#00cccc", label: "Teal" },
];

const DEFAULT_CONFIG: SiteConfig = {
  domain: "",
  siteName: "",
  tagline: "",
  heroSubtitle: "",
  accentColor: "#ff0066",
  partnerName: "",
  partnerUrl: "",
  partnerDescription: "",
  twitterHandle: "",
  categories: [
    { label: "", slug: "" },
    { label: "", slug: "" },
    { label: "", slug: "" },
  ],
};

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export default function Step1Config({ initialConfig, onSubmit }: Props) {
  const [config, setConfig] = useState<SiteConfig>(initialConfig || DEFAULT_CONFIG);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (field: keyof SiteConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const updateCategory = (idx: number, field: keyof Category, value: string) => {
    const updated = [...config.categories];
    updated[idx] = { ...updated[idx], [field]: value };
    // Auto-generate slug from label
    if (field === "label") {
      updated[idx].slug = slugify(value);
    }
    setConfig((prev) => ({ ...prev, categories: updated }));
  };

  const addCategory = () => {
    setConfig((prev) => ({
      ...prev,
      categories: [...prev.categories, { label: "", slug: "" }],
    }));
  };

  const removeCategory = (idx: number) => {
    setConfig((prev) => ({
      ...prev,
      categories: prev.categories.filter((_, i) => i !== idx),
    }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!config.domain.trim()) errs.domain = "Domain is required";
    if (!config.siteName.trim()) errs.siteName = "Site name is required";
    if (!config.tagline.trim()) errs.tagline = "Tagline is required";
    if (!config.heroSubtitle.trim()) errs.heroSubtitle = "Hero subtitle is required";
    if (!config.partnerName.trim()) errs.partnerName = "Partner name is required";
    if (!config.partnerUrl.trim()) errs.partnerUrl = "Partner URL is required";
    if (!config.partnerDescription.trim()) errs.partnerDescription = "Partner description is required";
    const validCats = config.categories.filter((c) => c.label.trim() && c.slug.trim());
    if (validCats.length < 2) errs.categories = "At least 2 categories are required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const cleanConfig = {
      ...config,
      categories: config.categories.filter((c) => c.label.trim() && c.slug.trim()),
    };
    onSubmit(cleanConfig);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: "32px" }}>
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: "10px",
            color: "var(--accent)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: "8px",
          }}
        >
          » STEP 1 OF 5
        </div>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "8px" }}>Site Configuration</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
          Define the identity of your new satellite site. This information is locked into the template and controls the design, SEO, and brand.
        </p>
      </div>

      {/* ── Section: Identity ── */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: "10px",
            color: "var(--text-tertiary)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: "20px",
            paddingBottom: "12px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          // SITE IDENTITY
        </div>

        <div className="grid-2" style={{ marginBottom: "16px" }}>
          <div>
            <label className="form-label">Domain</label>
            <input
              className="form-input"
              placeholder="ecommercesessionrecording.com"
              value={config.domain}
              onChange={(e) => update("domain", e.target.value)}
            />
            {errors.domain && <p style={{ color: "var(--error)", fontSize: "12px", marginTop: "4px" }}>{errors.domain}</p>}
            <p className="form-hint">The full domain without https://</p>
          </div>
          <div>
            <label className="form-label">Site Name</label>
            <input
              className="form-input"
              placeholder="Ecommerce Session Recording"
              value={config.siteName}
              onChange={(e) => update("siteName", e.target.value)}
            />
            {errors.siteName && <p style={{ color: "var(--error)", fontSize: "12px", marginTop: "4px" }}>{errors.siteName}</p>}
            <p className="form-hint">Used in nav, footer, and meta tags</p>
          </div>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label className="form-label">Hero Tagline (H1 accent line)</label>
          <input
            className="form-input"
            placeholder="See Every Session. Fix Every Drop-Off."
            value={config.tagline}
            onChange={(e) => update("tagline", e.target.value)}
          />
          {errors.tagline && <p style={{ color: "var(--error)", fontSize: "12px", marginTop: "4px" }}>{errors.tagline}</p>}
          <p className="form-hint">Short accent phrase shown below your site name in the H1. Do NOT include your site name here — just the tagline. Example: "See Every Session. Fix Every Drop-Off." (under 60 chars)</p>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label className="form-label">Hero Subtitle (body paragraph)</label>
          <textarea
            className="form-textarea"
            style={{ minHeight: "80px" }}
            placeholder="The most comprehensive research-backed resource on session recording, click maps, and behavioral analytics for ecommerce stores..."
            value={config.heroSubtitle}
            onChange={(e) => update("heroSubtitle", e.target.value)}
          />
          {errors.heroSubtitle && <p style={{ color: "var(--error)", fontSize: "12px", marginTop: "4px" }}>{errors.heroSubtitle}</p>}
          <p className="form-hint">2-3 sentences. Include primary keywords. No em dashes.</p>
        </div>

        <div>
          <label className="form-label">Twitter Handle (optional)</label>
          <input
            className="form-input"
            placeholder="@yoursitehandle"
            value={config.twitterHandle}
            onChange={(e) => update("twitterHandle", e.target.value)}
          />
          <p className="form-hint">Used in Twitter Card meta tags</p>
        </div>
      </div>

      {/* ── Section: Accent Color ── */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: "10px",
            color: "var(--text-tertiary)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: "20px",
            paddingBottom: "12px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          // ACCENT COLOR
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px", flexWrap: "wrap" }}>
          {PRESET_COLORS.map((c) => (
            <button
              key={c.hex}
              type="button"
              title={c.label}
              onClick={() => update("accentColor", c.hex)}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "4px",
                background: c.hex,
                border: config.accentColor === c.hex ? "3px solid var(--text-primary)" : "2px solid transparent",
                cursor: "pointer",
                transition: "transform 0.1s, border 0.1s",
                transform: config.accentColor === c.hex ? "scale(1.15)" : "scale(1)",
              }}
            />
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="color"
              value={config.accentColor}
              onChange={(e) => update("accentColor", e.target.value)}
              style={{
                width: "36px",
                height: "36px",
                border: "1px solid var(--border)",
                borderRadius: "4px",
                background: "var(--bg-input)",
                cursor: "pointer",
                padding: "2px",
              }}
            />
            <span style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "var(--text-secondary)" }}>
              {config.accentColor.toUpperCase()}
            </span>
          </div>
        </div>
        <p className="form-hint">Controls CTAs, logo color, category labels, and link highlights across the entire site.</p>
      </div>

      {/* ── Section: Partner ── */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: "10px",
            color: "var(--text-tertiary)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: "20px",
            paddingBottom: "12px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          // PARTNER LINK (AFFILIATE / SPONSOR)
        </div>

        <div className="grid-2" style={{ marginBottom: "16px" }}>
          <div>
            <label className="form-label">Partner Name</label>
            <input
              className="form-input"
              placeholder="FullStory"
              value={config.partnerName}
              onChange={(e) => update("partnerName", e.target.value)}
            />
            {errors.partnerName && <p style={{ color: "var(--error)", fontSize: "12px", marginTop: "4px" }}>{errors.partnerName}</p>}
          </div>
          <div>
            <label className="form-label">Partner URL</label>
            <input
              className="form-input"
              placeholder="https://www.fullstory.com"
              value={config.partnerUrl}
              onChange={(e) => update("partnerUrl", e.target.value)}
            />
            {errors.partnerUrl && <p style={{ color: "var(--error)", fontSize: "12px", marginTop: "4px" }}>{errors.partnerUrl}</p>}
          </div>
        </div>

        <div>
          <label className="form-label">Partner Description (1 sentence)</label>
          <input
            className="form-input"
            placeholder="FullStory is a great place to start if you're looking for a tool built specifically for session recording."
            value={config.partnerDescription}
            onChange={(e) => update("partnerDescription", e.target.value)}
          />
          {errors.partnerDescription && <p style={{ color: "var(--error)", fontSize: "12px", marginTop: "4px" }}>{errors.partnerDescription}</p>}
          <p className="form-hint">Appears in the hero body text as an inline link. No em dashes.</p>
        </div>
      </div>

      {/* ── Section: Categories ── */}
      <div className="card" style={{ marginBottom: "32px" }}>
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: "10px",
            color: "var(--text-tertiary)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: "20px",
            paddingBottom: "12px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>// CATEGORIES (3-6 RECOMMENDED)</span>
          <span style={{ color: "var(--text-tertiary)", fontSize: "10px" }}>{config.categories.filter(c => c.label).length} defined</span>
        </div>

        {errors.categories && (
          <p style={{ color: "var(--error)", fontSize: "12px", marginBottom: "12px" }}>{errors.categories}</p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
          {config.categories.map((cat, idx) => (
            <div key={idx} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "10px",
                  color: "var(--text-tertiary)",
                  minWidth: "20px",
                  flexShrink: 0,
                }}
              >
                {String(idx + 1).padStart(2, "0")}
              </span>
              <input
                className="form-input"
                placeholder="Category Label (e.g. Scroll Maps)"
                value={cat.label}
                onChange={(e) => updateCategory(idx, "label", e.target.value)}
                style={{ flex: 2 }}
              />
              <input
                className="form-input"
                placeholder="slug (auto)"
                value={cat.slug}
                onChange={(e) => updateCategory(idx, "slug", e.target.value)}
                style={{ flex: 1, fontFamily: "var(--mono)", fontSize: "12px" }}
              />
              {config.categories.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeCategory(idx)}
                  style={{
                    background: "none",
                    border: "1px solid var(--border)",
                    color: "var(--text-tertiary)",
                    cursor: "pointer",
                    padding: "8px 10px",
                    borderRadius: "3px",
                    fontSize: "12px",
                    flexShrink: 0,
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addCategory}
          style={{
            background: "none",
            border: "1px dashed var(--border)",
            color: "var(--text-tertiary)",
            cursor: "pointer",
            padding: "10px 16px",
            borderRadius: "3px",
            fontFamily: "var(--mono)",
            fontSize: "10px",
            letterSpacing: "0.08em",
            width: "100%",
            transition: "border-color 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-focus)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-tertiary)";
          }}
        >
          + ADD CATEGORY
        </button>
      </div>

      {/* ── Accessibility QA panel ── */}
      <div className="card" style={{ marginBottom: "24px", borderColor: "#1a1a1a" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--text-tertiary)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid var(--border)" }}>
          // ACCESSIBILITY QA
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Button preview */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "var(--text-secondary)", minWidth: "120px" }}>CTA Button:</div>
            <div style={{
              background: config.accentColor,
              color: getContrastTextColor(config.accentColor),
              fontFamily: "var(--mono)",
              fontSize: "11px",
              fontWeight: 700,
              padding: "8px 16px",
              borderRadius: "2px",
              letterSpacing: "0.06em",
            }}>
              START READING →
            </div>
            <span style={{ fontFamily: "var(--mono)", fontSize: "10px", color: getContrastRating(config.accentColor).pass ? "var(--success)" : "var(--error)" }}>
              {getContrastRating(config.accentColor).pass ? "✓ WCAG AA" : "✗ LOW CONTRAST"}
              {" "}{getContrastRating(config.accentColor).ratio}:1
            </span>
          </div>
          {/* Category label preview */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "var(--text-secondary)", minWidth: "120px" }}>Category label:</div>
            <span style={{ fontFamily: "var(--mono)", fontSize: "10px", color: config.accentColor, letterSpacing: "0.08em" }}>SCROLL MAPS</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: "10px", color: getBodyContrastRating(config.accentColor).pass ? "var(--success)" : "var(--error)" }}>
              {getBodyContrastRating(config.accentColor).pass ? "✓ readable on #0a0a0a" : "✗ too dark on #0a0a0a"}
            </span>
          </div>
          {/* Body text reminder */}
          <div style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--text-tertiary)", lineHeight: 1.6 }}>
            Body text: <span style={{ color: "#c8c8c8" }}>#c8c8c8</span> on <span style={{ color: "var(--text-secondary)" }}>#0a0a0a</span> — contrast 11.5:1 ✓ &nbsp;|
            Secondary: <span style={{ color: "#aaaaaa" }}>#aaaaaa</span> — contrast 8.1:1 ✓ &nbsp;|
            Tertiary: <span style={{ color: "#888888" }}>#888888</span> — contrast 5.5:1 ✓
          </div>
        </div>
      </div>

      {/* ── Preview ── */}
      {config.siteName && (
        <div
          className="card"
          style={{ marginBottom: "32px", borderColor: "#1a1a1a", background: "#050505" }}
        >
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: "10px",
              color: "var(--text-tertiary)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: "16px",
            }}
          >
            // PREVIEW
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: "11px", color: config.accentColor, letterSpacing: "0.06em" }}>
              {config.siteName.toUpperCase()}
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>
              {config.siteName}:
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "18px", fontWeight: 700, color: config.accentColor }}>
              {config.tagline || "Your Tagline Here"}
            </div>
            {config.categories.filter(c => c.label).length > 0 && (
              <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
                {config.categories.filter(c => c.label).map((c) => (
                  <span
                    key={c.slug}
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "9px",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      padding: "3px 8px",
                      border: `1px solid ${config.accentColor}33`,
                      color: config.accentColor,
                      borderRadius: "2px",
                    }}
                  >
                    {c.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="submit" className="btn btn-primary" style={{ fontSize: "12px", padding: "14px 32px" }}>
          CONTINUE TO TOPIC GENERATION →
        </button>
      </div>
    </form>
  );
}
