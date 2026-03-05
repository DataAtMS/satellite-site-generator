const SLUG_STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'your', 'you', 'we', 'our', 'their',
  'this', 'that', 'these', 'those', 'it', 'its', 'how', 'what', 'when',
  'where', 'why', 'which', 'who', 'into', 'about', 'as', 'up', 'out',
]);

function slugify(title) {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);

  const contentWords = words.filter((w) => !SLUG_STOP_WORDS.has(w));
  const stopWords = words.filter((w) => SLUG_STOP_WORDS.has(w));

  let slugWords;
  if (contentWords.length >= 4) {
    slugWords = contentWords.slice(0, 5);
  } else if (contentWords.length >= 2) {
    slugWords = [...contentWords];
    for (const sw of stopWords) {
      if (slugWords.length >= 4) break;
      slugWords.push(sw);
    }
    slugWords = slugWords.slice(0, 5);
  } else {
    slugWords = words.slice(0, 5);
  }

  return slugWords.join('-');
}

const titles = [
  'How to Use Scroll Maps to Understand User Behavior on Your Ecommerce Store',
  'AB Testing Bias and Why Sequential Tests Give You False Winners',
  'Click Maps for Product Pages',
  'Mobile Heatmap Setup Guide',
  'What Exit Intent Data Reveals About Abandoning Visitors',
  'Minimum Detectable Effect Calculator for AB Tests',
  'Why Your Hero Section Is Losing Sales',
  'Form Length and Lead Quality',
  'Sample Ratio Mismatch in Split Tests',
];

console.log('Slug generation test:\n');
titles.forEach(t => {
  const slug = slugify(t);
  const wordCount = slug.split('-').length;
  const status = wordCount <= 5 ? '✓' : '✗ TOO LONG';
  console.log(`${status} [${wordCount}w] ${slug.padEnd(45)} ← ${t}`);
});
