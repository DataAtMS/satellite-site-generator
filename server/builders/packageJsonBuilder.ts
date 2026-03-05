interface SiteConfig {
  domain: string;
  siteName: string;
}

export function buildPackageJson(siteConfig: SiteConfig): string {
  const name = siteConfig.domain.replace(/\./g, "-").replace(/[^a-z0-9-]/g, "");
  return JSON.stringify(
    {
      name,
      version: "1.0.0",
      type: "module",
      license: "MIT",
      scripts: {
        dev: "vite",
        build: "tsc && vite build",
        preview: "vite preview",
      },
      dependencies: {
        "lucide-react": "^0.453.0",
        react: "^19.0.0",
        "react-dom": "^19.0.0",
        wouter: "^3.3.5",
      },
      devDependencies: {
        "@types/react": "^19.0.0",
        "@types/react-dom": "^19.0.0",
        "@vitejs/plugin-react": "^4.3.4",
        typescript: "^5.6.3",
        vite: "^6.0.0",
      },
    },
    null,
    2
  );
}
