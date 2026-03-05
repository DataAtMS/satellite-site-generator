export interface Category {
  label: string;
  slug: string;
}

export interface SiteConfig {
  domain: string;
  siteName: string;
  tagline: string;
  heroSubtitle: string;
  accentColor: string;
  partnerName: string;
  partnerUrl: string;
  partnerDescription: string;
  twitterHandle: string;
  categories: Category[];
}

export interface TopicIdea {
  id: string;
  title: string;
  angle: string;
  targetKeyword: string;
  categorySlug: string;
  categoryLabel: string;
  selected: boolean;
}

export interface WrittenArticle {
  topicId: string;
  slug: string;
  title: string;
  categorySlug: string;
  categoryLabel: string;
  targetKeyword: string;
  content: string;
  metaDescription: string;
  excerpt: string;
  altText: string;
  thumbnail: string;
  datePublished: string;
  dateModified: string;
  status: "pending" | "writing" | "done" | "error";
  error?: string;
}

export interface LogLine {
  message: string;
  type: "info" | "success" | "error" | "warning";
  timestamp: string;
}

export interface GeneratorState {
  step: 1 | 2 | 3 | 4;
  siteConfig: SiteConfig | null;
  topicIdeas: TopicIdea[];
  writtenArticles: WrittenArticle[];
  writingLog: LogLine[];
  isWriting: boolean;
  isGenerating: boolean;
  generationLog: LogLine[];
  downloadUrl: string | null;
}
