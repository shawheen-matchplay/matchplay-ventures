"""Build the portfolio from content/portfolio/<key>.json.

Each file is one company (what the homepage grid and modal show) plus an
optional "article", our "Why we invested" post. The portfolio editor
(/editor/) writes these files; .github/workflows/build-portfolio.yml runs
this script after every change. Standard library only:

    python3 tools/portfolio/build.py

It regenerates, and only touches:
  - index.html: the grid cells, the "Investments to date" number, the PORTCOS
    modal data and the portfolio ItemList in the JSON-LD (between markers)
  - portfolio/<slug>/index.html for every published article, and removes the
    folders of articles that were deleted, hidden or renamed
  - sitemap.xml (article entries) and the Portfolio section of llms.txt

"hidden": true on a company leaves it off the site; on an article, it keeps
the company but drops the article (no page, no "Read our thesis" button).
Never hand-edit the generated parts: change the JSON (or this script) instead.
"""
import datetime as dt
import glob
import io
import json
import os
import re
import shutil

SITE = "https://matchplayventures.com"
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CONTENT = os.path.join(ROOT, "content", "portfolio")
# Hover accents for the grid cells, in order (.cell-1 … .cell-8 in index.html)
CELLS = 8


def esc(s):
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def read(path):
    with io.open(os.path.join(ROOT, path), encoding="utf-8") as f:
        return f.read()


def write(path, text):
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    old = None
    if os.path.exists(full):
        old = read(path)
    if old != text:
        with io.open(full, "w", encoding="utf-8", newline="\n") as f:
            f.write(text)
        print("wrote", path)


def load():
    companies = []
    for f in glob.glob(os.path.join(CONTENT, "*.json")):
        with io.open(f, encoding="utf-8") as fh:
            companies.append(json.load(fh))
    companies = [c for c in companies if not c.get("hidden")]
    return sorted(companies, key=lambda c: (c.get("order", 999), c["name"].lower()))


def article(c):
    """The company's published article, or None."""
    a = c.get("article")
    return a if a and not a.get("hidden") else None


def site_label(url):
    return re.sub(r"^https?://(www\.)?", "", url or "").rstrip("/")


def nice_date(iso):
    d = dt.date.fromisoformat(iso[:10])
    return d.strftime("%B ") + str(d.day) + d.strftime(", %Y")


def sentence(s):
    s = s.strip()
    return s if re.search(r"[.!?]$", s) else s + "."


def between(text, start, end, inner, what):
    i, j = text.find(start), text.find(end)
    if i < 0 or j < i:
        raise SystemExit("Couldn't find the %s markers (%s … %s)." % (what, start, end))
    return text[:i + len(start)] + inner + text[j:]


# ---- homepage ---------------------------------------------------------------
def grid(companies):
    cells = []
    for i, c in enumerate(companies):
        cells.append(
            '      <button type="button" class="portfolio-cell cell-%d" data-company="%s">\n'
            '        <div class="portfolio-logo"><img loading="lazy" decoding="async" src="%s" alt="%s"></div>\n'
            '        <div class="portfolio-meta"><span class="portfolio-meta-tag">●</span> %s</div>\n'
            "      </button>" % (i % CELLS + 1, esc(c["key"]), esc(c["logo"]), esc(c["name"]), esc(c["tag"])))
    # Fill out the last row (4 across, 2 on phones) so the grid has no hole
    while len(cells) % 4:
        cells.append('      <div class="portfolio-cell portfolio-cell-empty" aria-hidden="true"></div>')
    return "\n" + "\n".join(cells) + "\n      "


def portcos(companies):
    data = {}
    for c in companies:
        d = {"name": c["name"], "site": c["site"], "siteLabel": site_label(c["site"]),
             "logo": c["logo"], "tag": c["tag"], "desc": c["desc"]}
        if c.get("founder") and c["founder"].get("name"):
            d["founder"] = c["founder"]
        a = article(c)
        if a:
            d["blog"] = "portfolio/%s/" % a["slug"]
        data[c["key"]] = d
    body = json.dumps(data, indent=2, ensure_ascii=False).replace("</", "<\\/")
    return " const PORTCOS = " + body.replace("\n", "\n  ") + "; "


def item_list(companies):
    return {
        "@type": "ItemList",
        "name": "MatchPlay Ventures portfolio",
        "url": SITE + "/#portfolio",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1,
             "item": {"@type": "Organization", "name": c["name"], "url": c["site"], "description": c["summary"]}}
            for i, c in enumerate(companies)
        ],
    }


def homepage(companies):
    page = read("index.html")
    page = between(page, "<!-- portfolio-grid:start -->", "<!-- portfolio-grid:end -->", grid(companies), "grid")
    page = between(page, "/* PORTCOS:start */", "/* PORTCOS:end */", portcos(companies), "PORTCOS")
    page = re.sub(r'(<div class="stat-num" data-portfolio-count>)\d+(</div>)',
                  lambda m: m.group(1) + str(len(companies)) + m.group(2), page)

    m = re.search(r'(<script type="application/ld\+json">\n)([\s\S]*?)(\n</script>)', page)
    ld = json.loads(m.group(2))
    ld["@graph"] = [item_list(companies) if g.get("@type") == "ItemList" else g for g in ld["@graph"]]
    page = page[:m.start(2)] + json.dumps(ld, indent=2, ensure_ascii=False).replace("</", "<\\/") + page[m.end(2):]
    write("index.html", page)


# ---- article pages ----------------------------------------------------------
BACK = 'href="../../#portfolio" onclick="if(window.opener&amp;&amp;!window.opener.closed){event.preventDefault();window.close();}"'


def article_page(c, a):
    url = "%s/portfolio/%s/" % (SITE, a["slug"])
    image = "%s/assets/og/%s.jpg" % (SITE, a["slug"])
    why = "Why we invested in " + c["name"]
    ld = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "BlogPosting",
                "@id": url + "#article",
                "headline": a["title"],
                "alternativeHeadline": why,
                "description": a["description"],
                "image": image,
                "datePublished": a["datePublished"],
                "dateModified": a.get("dateModified") or a["datePublished"],
                "author": {
                    "@type": "Person",
                    "name": a["author"],
                    "jobTitle": a["authorTitle"],
                    "worksFor": {"@id": SITE + "/#organization"},
                    "url": SITE + "/#team",
                },
                "publisher": {
                    "@type": "Organization",
                    "@id": SITE + "/#organization",
                    "name": "MatchPlay Ventures",
                    "url": SITE + "/",
                    "logo": {"@type": "ImageObject", "url": SITE + "/assets/icon-512.png"},
                },
                "mainEntityOfPage": url,
                "inLanguage": "en-US",
                "isPartOf": {"@type": "WebSite", "@id": SITE + "/#website", "url": SITE + "/", "name": "MatchPlay Ventures"},
                "about": {"@type": "Organization", "name": c["name"], "url": c["site"]},
            },
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/"},
                    {"@type": "ListItem", "position": 2, "name": "Portfolio", "item": SITE + "/#portfolio"},
                    {"@type": "ListItem", "position": 3, "name": why, "item": url},
                ],
            },
        ],
    }
    body = "\n".join(("      " + line) if line.strip() else "" for line in a["body"].strip("\n").split("\n"))
    v = {
        "name": esc(c["name"]), "url": url, "image": image, "title": esc(a["title"]),
        "h1": esc(sentence(a["title"])), "subtitle": esc(a["subtitle"]), "desc": esc(a["description"]),
        "alt": esc("%s: %s" % (why, sentence(a["title"]))), "date": a["datePublished"],
        "nice": nice_date(a["datePublished"]), "author": esc(a["author"]),
        "byline": esc("%s, %s" % (a["author"], a["authorTitle"])),
        "ld": json.dumps(ld, indent=2, ensure_ascii=False).replace("</", "<\\/"), "body": body, "back": BACK,
    }
    return """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Why We Invested in %(name)s | MatchPlay Ventures</title>
<meta name="description" content="%(desc)s" />
<link rel="canonical" href="%(url)s" />
<meta name="robots" content="index, follow, max-image-preview:large" />
<meta name="theme-color" content="#0A0A0A" />

<link rel="icon" href="/favicon.ico" sizes="48x48" />
<link rel="icon" type="image/png" sizes="192x192" href="/assets/icon-192.png" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />

<meta property="og:type" content="article" />
<meta property="og:site_name" content="MatchPlay Ventures" />
<meta property="og:locale" content="en_US" />
<meta property="og:url" content="%(url)s" />
<meta property="og:title" content="%(title)s" />
<meta property="og:description" content="%(desc)s" />
<meta property="og:image" content="%(image)s" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="%(alt)s" />
<meta property="article:published_time" content="%(date)s" />
<meta property="article:author" content="%(author)s" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="%(title)s" />
<meta name="twitter:description" content="%(desc)s" />
<meta name="twitter:image" content="%(image)s" />

<script type="application/ld+json">
%(ld)s
</script>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@100;200;300;400;500;600;700;800&family=Geist:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="../_shared.css" />
<link rel="stylesheet" href="../../assets/fx.css" />
</head>
<body data-light-page>
<div class="nav-wrap">
  <nav class="nav">
    <div class="nav-brand">
      <a href="../../"><img class="nav-brand-mark" src="../../logo/logo.png" alt="MatchPlay Ventures"></a>
    </div>
    <div class="nav-links">
      <a href="../../#thesis" class="nav-link">Thesis</a>
      <a href="../../#ecosystem" class="nav-link">Ecosystem</a>
      <a href="../../#portfolio" class="nav-link">Portfolio</a>
      <a href="../../#team" class="nav-link">Team</a>
    </div>
    <div class="nav-aux">
      <a href="../../capital-partners/" class="nav-link">Capital Partners</a>
    </div>
    <a href="https://app.matchplaygroup.com" target="_blank" rel="noopener" class="nav-cta">Apply →</a>
  </nav>
</div>
  <div class="container">
    <a class="back-link" %(back)s>← Back to portfolio</a>
    <h1>%(h1)s</h1>
    <p class="subtitle">%(subtitle)s</p>
    <div class="meta"><span>%(byline)s</span><time datetime="%(date)s">%(nice)s</time></div>
    <article>
%(body)s
    </article>
    <a class="footer-link" %(back)s>← Back to portfolio</a>
  </div>
<script src="../../assets/fx.js" defer></script>
</body>
</html>
""" % v


def articles(companies):
    live = set()
    for c in companies:
        a = article(c)
        if a:
            live.add(a["slug"])
            write("portfolio/%s/index.html" % a["slug"], article_page(c, a))
    # Pages of articles that were deleted, hidden or renamed
    for d in glob.glob(os.path.join(ROOT, "portfolio", "*", "")):
        slug = os.path.basename(os.path.dirname(d))
        if slug not in live and os.path.exists(os.path.join(d, "index.html")):
            shutil.rmtree(d)
            print("removed portfolio/%s/" % slug)


# ---- sitemap.xml and llms.txt ------------------------------------------------
def sitemap(companies):
    old = read("sitemap.xml")
    keep = re.findall(r"  <url>\n    <loc>(?!%s/portfolio/)[\s\S]*?</url>\n" % re.escape(SITE), old)
    posts = []
    for c in companies:
        a = article(c)
        if a:
            posts.append("  <url>\n    <loc>%s/portfolio/%s/</loc>\n    <lastmod>%s</lastmod>\n  </url>\n"
                         % (SITE, a["slug"], (a.get("dateModified") or a["datePublished"])[:10]))
    write("sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?>\n'
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "".join(keep + posts) + "</urlset>\n")


def llms(companies):
    lines = []
    for c in companies:
        line = "- [%s](%s): %s" % (c["name"], c["site"], sentence(c["summary"]))
        a = article(c)
        if a:
            line += " Investment thesis: %s/portfolio/%s/" % (SITE, a["slug"])
        lines.append(line)
    text = read("llms.txt")
    text = re.sub(r"(## Portfolio\n\n)[\s\S]*?(\n\n## |\Z)", lambda m: m.group(1) + "\n".join(lines) + m.group(2), text, count=1)
    write("llms.txt", text)


if __name__ == "__main__":
    companies = load()
    homepage(companies)
    articles(companies)
    sitemap(companies)
    llms(companies)
