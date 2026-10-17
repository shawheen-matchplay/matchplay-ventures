# MatchPlay Ventures site

Marketing site for MatchPlay Ventures (https://matchplayventures.com), the early-stage venture arm of MatchPlay Group. The owner is Shawheen Attar, a Venture Partner at MatchPlay. Plain static HTML, CSS, and vanilla JS with no build step, hosted on GitHub Pages from `main` (repo `shawheen-matchplay/matchplay-ventures`, custom domain in `CNAME`).

The repo is public and GitHub Pages serves every file in it (`.nojekyll` is set so `_shared.css` is served), including this one. Keep secrets and internal-only notes out of the repo.

## Workflow

- The user asks for a change. Make it, verify it in the preview, commit, push a branch, open a PR, and merge it so it goes live. For large or design-heavy changes, leave the PR open for review until the user says "merge".
- Preview: use the `npx-serve` config in `.claude/launch.json` (port 3000). The `python-static` config has failed with a PermissionError in Claude Code's sandbox.
- Screenshots of the preview can lag behind scrolling, catch the scroll-in fade animations mid-way, or garble `backdrop-filter`. Check layout with DOM/JS queries too, and turn off `.in-view-target` transitions when capturing.
- Use the `gh` CLI for PRs. Commit messages are short and imperative ("Add 3DOS to the portfolio").
- When showing design options, build a temporary review page, keep it out of git, and delete it once the user picks one.

## Style rules

- **No em-dashes anywhere in site copy.** Use commas, periods, colons, or parentheses.
- Copy is concise and confident. Portfolio blurbs are 2 sentences (around 45 to 55 words): what the company does, then why it matters.
- Colors: orange accent `#F97D4A` (`--ventures`), cyan `#1ED2F4` (`--group`), dark background `#0A0A0A`.
- Fonts: Sora (display/headings), Geist (body), JetBrains Mono (labels, eyebrows, tags).
- Multi-line headings need loose enough line-height (about 1.02 to 1.14) so the lines don't crowd each other.

## Structure

- `index.html`: the homepage, including all of its CSS and JS. Sections: hero, `#thesis`, `#ecosystem` (cards: Group, Ventures, Capital Partners), `#portfolio`, stats, `#team`, final CTA, footer.
- `capital-partners/index.html`: the investor-facing Capital Partners page, with its own inline CSS that mirrors the site tokens. Its CTAs ("Join") go to `https://app.matchplaygroup.com/#/auth/investor-signup` and open in a new tab.
- `portfolio/<article-slug>/index.html`: "Why we invested" posts, one per company that has one. All of them share `portfolio/_shared.css`. The back link returns to `../../#portfolio`, or closes the tab if the post was opened from the homepage modal.
- `assets/team/`, `assets/founders/`, `portco-logos/`, `logo/logo.png`, `assets/og/` (1200x630 social images, one per page).
- SEO/AEO/GEO files: `favicon.ico` (16/32/48), `apple-touch-icon.png`, `assets/icon-192.png`, `assets/icon-512.png`, `site.webmanifest`, `robots.txt`, `sitemap.xml`, `llms.txt`.

## Nav (identical on every page)

Logo | Thesis, Ecosystem, Portfolio, Team | divider | Capital Partners | Apply → (far right, links to https://app.matchplaygroup.com).
- The divider is a `.nav-aux::before` pseudo-element, 1px x 22px, so it matches the logo divider. It is hidden at 880px and below.
- On the homepage, the logo links to `#top`.
- Subpages use relative links (`../#thesis`, `../../capital-partners/`, etc.). The Capital Partners page marks its own link with `aria-current="page"` and shows "Join →" in place of "Apply →".

## Portfolio

Grid of 8 companies, in this order: Jeeva, NeuroVRD, Tenzr, Geneial, SOLUtion, KBO, Guidant BioTherapeutics, 3DOS. Each cell is a `<button class="portfolio-cell cell-N" data-company="key">` that opens a modal. The modal is driven by the `PORTCOS` object in `index.html`:

```js
key: { name, site, siteLabel, logo, tag, desc, founder: { name, title, photo }, blog }
```

The modal shows "Read our thesis" only when `blog` is set. "Visit website" always shows.

**To add a company, update all of these:**
1. A grid cell in `#portfolio` (logos use `loading="lazy" decoding="async"`).
2. A `PORTCOS` entry. Rewrite the user's description to match the tone and length of the others.
3. The logo in `portco-logos/` (transparent background preferred) and the founder photo in `assets/founders/` (square crop).
4. The JSON-LD `ItemList` in the `index.html` head.
5. `llms.txt`.
6. The "Investments to date" stat, if the count changed.

**To add a blog post:** create `portfolio/<title-slug>/index.html` by copying an existing post. Update the title ("Why We Invested in X | MatchPlay Ventures"), meta description, canonical, OG/Twitter tags plus a new `assets/og/<slug>.jpg`, the JSON-LD BlogPosting and BreadcrumbList, and the `<time datetime>`. Then set `blog` in `PORTCOS`, and add the URL to `sitemap.xml` and `llms.txt`.

## Team (in display order)

Mahesh Narayanan (Managing Partner), Steven Richer (Venture Partner), Shawheen Attar (Venture Partner), Hari Gopal (Venture Partner), Aakarsh Malhotra (Junior Venture Partner), Karim ReFaey (Junior Venture Partner). The user reviewed alternative layouts in Oct 2026 and chose to keep the current two-column photo-and-text design.

If the team changes, also update the Organization `employee` list in the JSON-LD and `llms.txt`.

## SEO checklist for new pages

Unique `<title>` and meta description, a canonical URL (trailing slash, never `/index.html`), OG and Twitter tags with an image, JSON-LD, the favicon `<link>` set, an entry in `sitemap.xml` (update `lastmod`), and an entry in `llms.txt`. Internal links use directory-style URLs.

## Open items (only start these when the user asks)

- Hidden content still sits in `index.html`: the Navigator ecosystem card and a "How we work / One path in" section, both `display:none`. Consider removing them, since search engines can treat hidden content as a negative signal.
- The homepage Capital Partners card copy is written for founders. The new page is written for investors.
- Possible visible FAQ section (helps AEO).
- Organization `sameAs` is waiting on the user's LinkedIn and other social URLs.
- The Capital Partners page has no offering or securities disclaimer. Add one only with language the user provides.
- Search Console and Bing Webmaster Tools (sitemap submission, indexing requests) are done by the user, not from this repo.
