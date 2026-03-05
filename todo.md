# Site Generator TODO

## Critical Bugs
- [x] Add `_redirects` file to ZIP (fixes Netlify 404 on category/article pages)
- [x] Fix H1 tagline duplication bug (regex-based prefix stripping)
- [x] Fix TOC sidebar never appearing (remove inline display:none)
- [x] Fix blue underline on desktop text (link/anchor CSS issue in indexCssBuilder)

## Accessibility & Contrast
- [x] Fix white text on yellow button (contrast failure — use dark text on light accent colors)
- [x] Fix contrast regression — secondary text (#777) too low on #0a0a0a background
- [x] Bake WCAG accessibility rules into article writing and UX prompts

## Markdown Rendering
- [x] Fix table header rendering (use <th> not <td> for header row)

## Reading Experience Features
- [x] Add reading progress bar (thin accent-colored bar fixed to top of viewport)
- [x] Add article counter ("1/5") in article page nav area
- [x] Add FURTHER READING cross-category section at bottom of articles
- [ ] Add BACK TO ALL ARTICLES link at bottom of articles
- [ ] Add secondary category nav bar on article pages

## Homepage Improvements
- [x] Add editorial body copy section between featured card and topic sections
- [x] Add About This Site section before footer

## Image Pipeline
- [x] Replace placehold.co fallback with real image generation (AI image gen API)
- [x] Add image generation step to writeArticles.ts pipeline

## QA & Validation
- [x] Add accessibility QA panel in Step 1 Config (live contrast ratios, button preview)
- [ ] Add category label validation in generateTopics.ts (spell check, no typos)
- [ ] Add pre-delivery QA checklist step in the generator UI
- [x] Add accessibility contrast validation to generated CSS

## Live Deploy Pipeline
- [x] Add Drizzle ORM + MySQL2 to site-generator (standalone, no webdev_add_feature needed)
- [x] Store GITHUB_PAT and NETLIFY_PAT as secrets (both validated)
- [x] Define DB schema: generated_sites, site_articles, site_categories, site_deploys
- [x] Run pnpm db:push to migrate schema
- [x] Build deployToGithub route: create repo + push all generated files via Octokit
- [x] Build deployToNetlify route: create Netlify site linked to GitHub repo
- [x] Build redeployToGithub route: push content updates to existing repo
- [x] Build sitesApi route: CRUD for sites, articles, deploy history
- [x] Replace ZIP download with Deploy Live / Download ZIP toggle in Step4Generate
- [x] Persist generated site to DB on deploy
- [x] Build My Sites dashboard page (/sites)
- [x] Build SiteEditor page (/sites/:id) with article editor, SEO panel, deploy history
- [x] Add SEO panel per article (metaDescription, canonicalUrl, ogImage, dateModified)
- [x] Update App.tsx routing and Header.tsx navigation
- [x] Write vitest tests: 55 tests passing, TypeScript clean
- [x] Fix Vite proxy configuration
- [x] End-to-end QA pass

## Future
- [ ] Category label spell-check (Levenshtein distance warning in Step 1)
- [ ] Thumbnail fallback to Unsplash keyword URL when image gen is skipped
- [ ] Step 5 QA Preview iframe before download/deploy
- [ ] Custom domain assignment via Netlify API
- [ ] Analytics integration (Plausible embed)
- [ ] Deploy preview URLs for draft edits before going live
