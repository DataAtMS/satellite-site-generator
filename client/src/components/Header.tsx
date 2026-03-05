import { Link, useLocation } from "wouter";

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
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Link href="/">
            <a style={{ textDecoration: "none" }}>
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--accent)",
                  letterSpacing: "0.08em",
                  cursor: "pointer",
                }}
              >
                SATELLITE SITE GENERATOR
              </span>
            </a>
          </Link>
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: "9px",
              color: "var(--text-tertiary)",
              letterSpacing: "0.06em",
              background: "#111",
              border: "1px solid var(--border)",
              padding: "2px 6px",
              borderRadius: "2px",
            }}
          >
            INTERNAL TOOL
          </span>
        </div>

        <nav style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          {navLink("/", "GENERATOR")}
          {navLink("/sites", "MY SITES")}
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: "10px",
              color: "var(--text-tertiary)",
              letterSpacing: "0.05em",
            }}
          >
            POWERED BY CLAUDE
          </span>
        </nav>
      </div>
    </header>
  );
}
