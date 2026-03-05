interface SiteConfig {
  siteName: string;
  accentColor: string;
  categories: { label: string; slug: string }[];
}

function esc(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n");
}

export function buildAppTsx(siteConfig: SiteConfig): string {
  const categoryRoutes = siteConfig.categories
    .map((c) => `      <Route path="/${c.slug}" component={CategoryPage} />`)
    .join("\n");

  return `import { Route, Switch } from "wouter";
import Home from "./pages/Home";
import ArticlePage from "./pages/ArticlePage";
import CategoryPage from "./pages/CategoryPage";
import Sitemap from "./pages/Sitemap";
import { Link } from "wouter";

function NotFound() {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: "${esc(siteConfig.accentColor)}", letterSpacing: "0.12em", marginBottom: "16px" }}>
          404 — NOT FOUND
        </div>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.5rem", color: "#f0f0f0", marginBottom: "16px" }}>
          Page not found
        </h1>
        <Link href="/">
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "11px", color: "${esc(siteConfig.accentColor)}", cursor: "pointer", letterSpacing: "0.06em" }}>
            ← BACK TO ${esc(siteConfig.siteName.toUpperCase())}
          </span>
        </Link>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/articles/:slug" component={ArticlePage} />
      <Route path="/sitemap" component={Sitemap} />
${categoryRoutes}
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return <Router />;
}
`;
}
