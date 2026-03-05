interface SiteConfig {
  domain: string;
}

export function buildRobotsTxt(siteConfig: SiteConfig): string {
  const siteUrl = `https://${siteConfig.domain}`;
  return `User-agent: *
Allow: /

# Allow AI crawlers
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: CCBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`;
}
