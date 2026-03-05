import { Link, useLocation } from "wouter";

// Moneysite logo — inline SVG mark + wordmark
function MoneysiteLogo() {
  return (
    <svg
      width="140"
      height="28"
      viewBox="0 0 140 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Moneysite"
    >
      {/* Mark: stylised M with dollar-sign notch */}
      <rect x="0" y="4" width="20" height="20" rx="3" fill="#ff0066" />
      {/* M shape */}
      <polyline
        points="4,20 4,8 10,16 16,8 16,20"
        fill="none"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Wordmark */}
      <text
        x="26"
        y="19"
        fontFamily="'Space Mono', monospace"
        fontWeight="700"
        fontSize="13"
        letterSpacing="0.04em"
        fill="#f0f0f0"
      >
        MONEYSITE
      </text>
    </svg>
  );
}

export default function Header() {
  const [location] = useLocation();

  const navLink = (href: string, label: string) => {
    const isActive = href === "/" ? location === "/" : location.startsWith(href);
    return (
      <Link href={href}>
        <a
          style={{
            fontFamily: "var(--mono)",
            fontSize: "10px",
            letterSpacing: "0.06em",
            color: isActive ? "var(--accent)" : "var(--text-tertiary)",
            textDecoration: "none",
            padding: "4px 0",
            borderBottom: `1px solid ${isActive ? "var(--accent)" : "transparent"}`,
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-secondary)"; }}
          onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-tertiary)"; }}
        >
          {label}
        </a>
      </Link>
    );
  };

  return (
    <header
      style={{
        borderBottom: "1px solid var(--border)",
        padding: "14px 0",
        background: "var(--bg)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/">
          <a style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
            <MoneysiteLogo />
          </a>
        </Link>

        <nav style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          {navLink("/", "GENERATOR")}
          {navLink("/sites", "MY SITES")}
        </nav>
      </div>
    </header>
  );
}
