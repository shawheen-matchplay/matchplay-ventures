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

- `index.html`: the homepage, including all of its CSS and JS (the portfolio parts are generated). Sections: hero, `#thesis`, `#ecosystem` (cards: Group, Ventures, Capital Partners), `#portfolio`, stats, `#team`, final CTA, footer.
- `capital-partners/index.html`: the investor-facing Capital Partners page, with its own inline CSS that mirrors the site tokens. Its CTAs ("Join") go to `https://app.matchplaygroup.com/#/auth/investor-signup` and open in a new tab.
- `portfolio/<article-slug>/index.html`: "Why we invested" posts, generated from `content/portfolio/` (see Portfolio). All of them share `portfolio/_shared.css`. The back link returns to `../../#portfolio`, or closes the tab if the post was opened from the homepage modal.
- `assets/team/`, `assets/founders/`, `portco-logos/`, `logo/logo.png`, `assets/og/` (1200x630 social images, one per page).
- `assets/fx.css` + `assets/fx.js`: shared effects on every page, ported from the Group site: the liquid-glass nav (tint 0.69, 0.8 over `.section-light` or on `body[data-light-page]` article pages; Chromium bends the backdrop; a lens slides between links on mouse/pen), pointer boxes (`data-tilt`: accent top rule, glow and 1° tilt; `data-glow`: rule and glow only, for edge-to-edge cells such as the thesis sectors (the portfolio grid uses it with `data-fx-noline` and no resting glow: hover only); `data-fx-light` for white boxes; `--fx-accent` picks the top rule's colour, and every glow is orange (`--fx-glow`, per the user) except the MatchPlay Group card, which glows cyan; touch screens light the box crossing 45% of the screen), and cross-page view transitions. Each page links them after its own styles. Main CTAs (`.btn-primary`) are solid orange; on hover they drain to clear glass in an inset orange ring with orange text, plus the Group site's wobble on hover (101%, from its glass-motion reference); the nav lens wobbles in (103%) on its first link; the nav's Apply / Join keep their solid orange look and never wobble. The homepage hero is exactly one screen tall (`100svh`): its logo, title and spacing scale with viewport height, so check short screens (1280x720, phones) after changing it. Its dot grid moves (`assets/hero-dots.js`: a canvas wind sway of about 4px with an orange gust every 11s, the user's pick of six drafts); with reduced motion the still CSS dots stay. `data-fx-noline` drops the accent rule (glow only). Never give the nav or an ancestor a permanent `view-transition-name`: it makes it a backdrop root and the glass bend goes blank, so fx.js adds the name only during a transition.
- SEO/AEO/GEO files: `favicon.ico` (16/32/48), `apple-touch-icon.png`, `assets/icon-192.png`, `assets/icon-512.png`, `site.webmanifest`, `robots.txt`, `sitemap.xml`, `llms.txt`.

## Nav (identical on every page)

Logo | Thesis, Ecosystem, Portfolio, Team | divider | Capital Partners | Apply → (far right, links to https://app.matchplaygroup.com).
- The divider is a `.nav-aux::before` pseudo-element, 1px x 22px, so it matches the logo divider. It is hidden at 880px and below.
- On the homepage, the logo links to `#top`.
- Subpages use relative links (`../#thesis`, `../../capital-partners/`, etc.). The Capital Partners page marks its own link with `aria-current="page"` and shows "Join →" in place of "Apply →".

## Portfolio

The portfolio is **generated**. Each company is one file, `content/portfolio/<key>.json`, holding what the grid and modal show plus an optional `article` (the "Why we invested" thesis):

```js
{ key, order, name, site, tag, desc, summary, logo, founder?: { name, title, photo }, hidden?,
  article?: { slug, title, subtitle, description, author, authorTitle, datePublished, dateModified, body (HTML), hidden?, ogCompany? } }
```

`python3 tools/portfolio/build.py` regenerates, from those files: the grid cells (between the `portfolio-grid` markers, last row padded with blank cells), the "Investments to date" number (`data-portfolio-count`), the `PORTCOS` modal object (between the `PORTCOS` markers), the JSON-LD `ItemList`, every `portfolio/<slug>/index.html` (and removes pages of deleted or hidden theses), the thesis entries in `sitemap.xml`, and the Portfolio section of `llms.txt`. **Never hand-edit those generated parts:** change the JSON or `build.py`, then rebuild. `summary` is the one-liner used in the JSON-LD and `llms.txt`; `siteLabel` and the modal's `blog` link are derived. `"hidden": true` on a company takes it (and its thesis) off the site; on an article, it drops just the thesis.

**The editor** (`/editor/`, `editor/index.html`, noindex and disallowed in robots.txt) is how the team adds companies and theses. A company can go live with no thesis; the thesis is written and published later from the same row. Thesis drafts are kept in the browser's localStorage until published. It works like the Group site's blog editor: a shared password decrypts a GitHub token stored AES-GCM encrypted in the page (the owner sets it with `node tools/portfolio/editor-setup.mjs`, using a fine-grained token with Contents read/write on this repo only), and saving commits straight to `main`. `.github/workflows/build-portfolio.yml` then runs the build, commits the output and requests a Pages build. The editor also makes each thesis's 1200x630 `assets/og/<slug>.jpg` (canvas, styled like the originals), crops founder photos to 600x600, resizes logos, and refuses em-dashes. `?debug=1` exposes `portfolioEditor.toHtml/toMarkdown/drawOg/unlockWith(cfg)` for testing; stub `fetch` for api.github.com and never test against the real repo.

When the user asks Claude to add a company directly, write the JSON (rewrite the description to match the others: 2 sentences, about 45 to 55 words), add the logo to `portco-logos/` and founder photo to `assets/founders/`, run the build, and commit the JSON and generated files together.

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
