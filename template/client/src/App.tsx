// Design: Minimal Dark Terminal — DTC101 Clone
// Routes: / (homepage) | /articles/:slug (article) | /:slug (category collection page)

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import ArticlePage from "./pages/ArticlePage";
import Sitemap from "./pages/Sitemap";
import CategoryPage from "./pages/CategoryPage";
function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/articles/:slug" component={ArticlePage} />
      <Route path="/sitemap" component={Sitemap} />
      <Route path="/scroll-maps" component={CategoryPage} />
      <Route path="/move-maps" component={CategoryPage} />
      <Route path="/mobile" component={CategoryPage} />
      <Route path="/ai-future" component={CategoryPage} />
      <Route path="/ethics-privacy" component={CategoryPage} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
