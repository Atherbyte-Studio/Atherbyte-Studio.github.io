/*
  tools/build.mjs: writes the website's pages. No dependencies; needs Node 18 or newer.

    node tools/build.mjs

  What it does
    1. Reads the page sources in src/pages/*.html (the text of each page, plus {{components}}).
    2. Fills in the shared header, footer, <head> tags and the product / service cards from content/site.mjs.
    3. Writes the finished pages next to the rest of the site (index.html, products/index.html, ...).
    4. Keeps the header and footer of the hand-written pages (account, game info pages, 404) in sync.
    5. Rewrites sitemap.xml.

  GitHub Pages publishes the committed files as they are. This script is a helper for editing, not part of the deployment.
  Run it after changing anything in content/ or src/, and commit the result.
*/
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SITE, STATUSES, NAV, PRODUCTS, CATEGORIES, SERVICES, SYNCED_PAGES } from "../content/site.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PAGES_DIR = join(ROOT, "src", "pages");

/* ---------- small helpers ---------- */
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const byId = (id) => {
  const p = PRODUCTS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown product "${id}"`);
  return p;
};

const ICONS = {
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  window: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9h18"/><circle cx="6.2" cy="6.5" r=".6" fill="currentColor"/><circle cx="8.6" cy="6.5" r=".6" fill="currentColor"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  cube: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>',
  flow: '<rect x="3" y="4" width="6" height="5" rx="1.5"/><rect x="15" y="15" width="6" height="5" rx="1.5"/><path d="M6 9v3a3 3 0 0 0 3 3h6"/>',
  pen: '<path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19z"/><path d="M14 7l3 3"/>',
  game: '<rect x="2" y="7" width="20" height="11" rx="5.5"/><path d="M7.5 10.5v4M5.5 12.5h4"/><circle cx="15.8" cy="11.6" r=".7" fill="currentColor"/><circle cx="18.2" cy="13.6" r=".7" fill="currentColor"/>',
  software: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="3"/><path d="m3 7 9 6 9-6"/>',
  instagram: '<rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>',
  facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'
};
const icon = (name, size = 20) =>
  `<svg class="icon" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`;

const mailto = (subject) => `mailto:${SITE.email}?subject=${encodeURIComponent(subject)}`;

/* ---------- components ---------- */
function badge(status) {
  const s = STATUSES[status];
  if (!s) throw new Error(`Unknown status "${status}"`);
  return `<span class="badge badge-${s.tone}"><span class="badge-dot" aria-hidden="true"></span>${s.label}</span>`;
}

function visual(p, { eager = false } = {}) {
  const v = p.visual;
  if (v.type === "image") {
    return `<img src="${v.src}" alt="${esc(v.alt)}" width="640" height="400"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async">`;
  }
  if (v.type === "mindclash") {
    const clue = '<li><i></i><b></b></li>';
    return `<div class="viz viz-mind" role="img" aria-label="Concept preview of Atherbyte Mind Clash: a four-digit secret code with four clues, and two players competing.">
        <div class="viz-tag">Concept preview</div>
        <div class="mind-code" aria-hidden="true"><span>?</span><span>?</span><span>?</span><span>?</span></div>
        <ul class="mind-clues" aria-hidden="true">${clue.repeat(4)}</ul>
        <div class="mind-vs" aria-hidden="true"><span>Player 1</span><em>vs</em><span>Player 2</span></div>
      </div>`;
  }
  if (v.type === "dental") {
    return `<div class="viz viz-dental" role="img" aria-label="Design concept for a dental clinic website: a navigation bar, a headline area and three service tiles. This is a project preview, not a live clinic website.">
        <div class="viz-tag">Project preview</div>
        <div class="dental-win" aria-hidden="true">
          <div class="dental-bar"><i></i><i></i><i></i></div>
          <div class="dental-page">
            <div class="dental-nav"><span class="dental-logo"></span><span>Your Clinic</span><b></b><b></b><b></b></div>
            <div class="dental-hero"><div><u></u><u></u><s></s></div><div class="dental-shape"></div></div>
            <div class="dental-tiles"><i></i><i></i><i></i></div>
          </div>
        </div>
      </div>`;
  }
  throw new Error(`Unknown visual type "${v.type}"`);
}

function actions(p) {
  const out = [];
  if (p.status === "available" && p.url) {
    out.push(
      `<a class="btn btn-primary has-arrow" href="${p.url}" data-play${p.requiresAccount ? ' data-requires-account="true"' : ""}>${p.cta || "Open"}<span class="visually-hidden"> ${esc(p.title)}</span></a>`
    );
  }
  if (p.page) {
    out.push(`<a class="btn btn-secondary" href="${p.page}">Details<span class="visually-hidden"> about ${esc(p.title)}</span></a>`);
  }
  if (out.length) return `<div class="pcard-actions">${out.join("")}</div>`;
  const note =
    p.status === "in-development" ? "In development. Not playable yet."
    : p.status === "in-progress" ? "Project in progress. Not a live product."
    : "Not available yet.";
  return `<p class="pcard-note">${note}</p>`;
}

function productCard(p, { variant = "card", level = 3, eager = false } = {}) {
  const tags = p.tags && p.tags.length ? `<ul class="tag-list">${p.tags.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : "";
  const text = variant === "compact" ? p.summary : p.summary;
  return `<article class="pcard pcard-${variant} reveal" data-status="${p.status}">
      <div class="pcard-media">${visual(p, { eager })}</div>
      <div class="pcard-body">
        <div class="pcard-meta">${badge(p.status)}<span class="pcard-cat">${esc(p.category)}</span></div>
        <h${level} class="pcard-title">${esc(p.title)}</h${level}>
        <p class="pcard-text">${esc(text)}</p>
        ${tags}
        ${actions(p)}
      </div>
    </article>`;
}

function grid({ kind, variant = "card", level = 3, group, ids } = {}) {
  let list = PRODUCTS;
  if (ids) list = ids.split(",").map((id) => byId(id.trim()));
  if (kind) list = list.filter((p) => p.kind === kind);
  if (group) list = list.filter((p) => p.group === group);
  if (!list.length) return `<p class="empty-note">Nothing here yet.</p>`;
  return `<div class="pgrid pgrid-${variant}">${list.map((p, i) => productCard(p, { variant, level: Number(level) })).join("\n")}</div>`;
}

function serviceCards({ level = 3, ask = "true" } = {}) {
  return `<div class="service-grid">${SERVICES.map(
    (s) => `<article class="service-card reveal" id="${s.id}">
      <div class="service-icon" aria-hidden="true">${icon(s.icon, 26)}</div>
      <h${level}>${esc(s.title)}</h${level}>
      <p>${esc(s.text)}</p>
      ${ask === "true" ? `<a class="service-inquiry link-arrow" href="${mailto("Inquiry: " + s.title)}">Ask about this</a>` : ""}
    </article>`
  ).join("\n")}</div>`;
}

function planned({ id }) {
  const p = byId(id);
  return `<ul class="check-list">${p.planned.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
}

function socialList() {
  const items = [
    `<li><a href="mailto:${SITE.email}" aria-label="Email Atherbyte Studio">${icon("mail")}<span>Email</span></a></li>`,
    ...SITE.social.map(
      (s) => `<li><a href="${s.href}" target="_blank" rel="noopener noreferrer" aria-label="Atherbyte Studio on ${s.label} (opens in a new tab)">${icon(s.id)}<span>${s.label}</span></a></li>`
    )
  ];
  return `<ul class="social-list">${items.join("")}</ul>`;
}

function emailBlock({ subject = "Project inquiry for Atherbyte Studio", label = "Email us" } = {}) {
  /* Plain mailto link that works without JavaScript; js/main.js adds the "Copy email address" button next to it. */
  return `<div class="contact-actions">
        <a class="btn btn-primary" href="${mailto(subject)}">${esc(label)}</a>
      </div>
      <p class="contact-note">Or write to <span class="contact-email">${SITE.email}</span></p>`;
}

function categoryPanels() {
  const icons = { games: "game", saas: "software" };
  return `<div class="cat-grid">${CATEGORIES.map((c) => {
    const items = PRODUCTS.filter((p) => p.kind === c.kind);
    return `<a class="cat-panel reveal" href="${c.href}">
      <span class="cat-icon" aria-hidden="true">${icon(icons[c.id], 26)}</span>
      <h3>${esc(c.title)}</h3>
      <p>${esc(c.blurb)}</p>
      <ul class="cat-items">${items.map((p) => `<li>${esc(p.title)} ${badge(p.status)}</li>`).join("")}</ul>
      <span class="link-arrow">${esc(c.cta)}</span>
    </a>`;
  }).join("")}</div>`;
}

function heroVisual() {
  const snake = byId("grid-snake");
  const timer = byId("stop-the-timer");
  const mind = byId("mind-clash");
  return `<div class="hero-visual">
        <figure class="hv hv-main"><img src="${snake.visual.src}" alt="${esc(snake.visual.alt)}" width="640" height="400" fetchpriority="high" decoding="async"><figcaption>Grid Snake ${badge("available")}</figcaption></figure>
        <figure class="hv hv-side"><img src="${timer.visual.src}" alt="${esc(timer.visual.alt)}" width="640" height="400" decoding="async"><figcaption>Stop the Timer ${badge("available")}</figcaption></figure>
        <figure class="hv hv-mind">${visual(mind)}<figcaption>Mind Clash ${badge("in-development")}</figcaption></figure>
      </div>`;
}

function crumbs(list) {
  if (!list || !list.length) return "";
  const li = list.map(([label, href], i) =>
    i === list.length - 1 ? `<li aria-current="page">${esc(label)}</li>` : `<li><a href="${href}">${esc(label)}</a></li>`
  );
  return `<nav aria-label="Breadcrumb"><ol class="breadcrumb">${li.join("")}</ol></nav>`;
}

/* ---------- header / footer ---------- */
function header(current) {
  const links = NAV.map(
    (n) => `<li><a href="${n.href}"${n.key === current ? ' aria-current="page"' : ""}>${esc(n.label)}</a></li>`
  ).join("\n          ");
  return `<header class="site-header">
    <div class="container header-inner">
      <a class="brand" href="/" aria-label="Atherbyte Studio, go to the home page">
        <img src="/assets/images/atherbyte-mark.webp" alt="" width="40" height="40">
        <span class="brand-name">Atherbyte <span>Studio</span></span>
      </a>

      <button class="nav-toggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="site-nav">
        <span class="bar"></span><span class="bar"></span><span class="bar"></span>
      </button>

      <nav class="site-nav" id="site-nav" aria-label="Main">
        <ul class="nav-list">
          ${links}
        </ul>
        <a class="nav-account" href="/account/"${current === "account" ? ' aria-current="page"' : ""} data-account-link>${icon("user", 18)}<span>Account</span></a>
      </nav>
    </div>
  </header>`;
}

function footer() {
  const col = (keys) =>
    keys.map((k) => { const n = NAV.find((x) => x.key === k); return `<li><a href="${n.href}">${esc(n.label)}</a></li>`; }).join("");
  return `<footer class="site-footer">
    <div class="container footer-grid">
      <div class="footer-brand">
        <a class="brand" href="/" aria-label="Atherbyte Studio, go to the home page">
          <img src="/assets/images/atherbyte-mark.webp" alt="" width="40" height="40" loading="lazy">
          <span class="brand-name">Atherbyte <span>Studio</span></span>
        </a>
        <p>A digital products company. We build games, software products and custom digital solutions.</p>
      </div>

      <nav aria-label="Footer: products">
        <p class="footer-heading">Products</p>
        <ul class="footer-links">${col(["products", "games", "saas"])}</ul>
      </nav>

      <nav aria-label="Footer: company">
        <p class="footer-heading">Studio</p>
        <ul class="footer-links">${col(["services", "portfolio", "about", "contact"])}<li><a href="/account/">Account</a></li></ul>
      </nav>

      <div>
        <p class="footer-heading">Online</p>
        ${socialList()}
      </div>
    </div>

    <div class="container footer-bottom">
      <p>&copy; <span data-year>2026</span> Atherbyte Studio. All rights reserved.</p>
    </div>
  </footer>`;
}

/* ---------- <head> ---------- */
function head(meta) {
  const url = SITE.origin + meta.path;
  const title = esc(meta.title);
  const desc = esc(meta.description);
  const img = SITE.origin + (meta.image || SITE.ogImage);
  const imgAlt = esc(meta.imageAlt || "Atherbyte Studio, a digital products company: logo on a dark background");
  const ld = meta.jsonld ? `\n  <script type="application/ld+json">${JSON.stringify(meta.jsonld)}</script>` : "";
  return `<meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <meta name="description" content="${desc}">
  <meta name="google-adsense-account" content="ca-pub-3219161174659178">
  <meta name="theme-color" content="#0B0B0F">
  <meta name="color-scheme" content="dark">
  <link rel="canonical" href="${url}">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3219161174659178" crossorigin="anonymous"></script>

  <link rel="icon" href="/favicon.ico" sizes="48x48">
  <link rel="icon" href="/assets/images/favicon.png" type="image/png" sizes="192x192">
  <link rel="apple-touch-icon" href="/assets/images/apple-touch-icon.png">

  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Atherbyte Studio">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${desc}">
  <meta property="og:locale" content="en_US">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${img}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${imgAlt}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${desc}">
  <meta name="twitter:image" content="${img}">
  <meta name="twitter:image:alt" content="${imgAlt}">${ld}

  <script>document.documentElement.classList.add("js");</script>
  <link rel="stylesheet" href="/css/styles.css">`;
}

const ORG_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": SITE.origin + "/#organization",
      name: SITE.name,
      url: SITE.origin + "/",
      logo: SITE.origin + "/assets/images/apple-touch-icon.png",
      description:
        "Atherbyte Studio is an independent digital products company building games, SaaS products, software tools and custom digital experiences.",
      email: SITE.email,
      sameAs: SITE.social.map((s) => s.href)
    },
    { "@type": "WebSite", "@id": SITE.origin + "/#website", url: SITE.origin + "/", name: SITE.name, publisher: { "@id": SITE.origin + "/#organization" } }
  ]
};

/* ---------- template engine ---------- */
function parseArgs(str = "") {
  const out = {};
  for (const m of str.matchAll(/(\w+)=("([^"]*)"|\S+)/g)) out[m[1]] = m[3] !== undefined ? m[3] : m[2];
  return out;
}

function render(template, ctx) {
  return template.replace(/\{\{\s*([\w-]+)([^}]*)\}\}/g, (_, name, rest) => {
    const a = parseArgs(rest);
    switch (name) {
      case "grid": return grid(a);
      case "card": return productCard(byId(a.id), { variant: a.variant, level: Number(a.level || 3) });
      case "services": return serviceCards(a);
      case "planned": return planned(a);
      case "categories": return categoryPanels();
      case "hero-visual": return heroVisual();
      case "social": return socialList();
      case "email": return emailBlock(a);
      case "badge": return badge(a.status);
      case "crumbs": return crumbs(ctx.meta.crumbs);
      case "mailto": return mailto(a.subject || "Project inquiry for Atherbyte Studio");
      case "site-email": return SITE.email;
      default: throw new Error(`Unknown component {{${name}}} in ${ctx.file}`);
    }
  });
}

function buildPage(file) {
  const src = readFileSync(join(PAGES_DIR, file), "utf8");
  const m = src.match(/^<!--meta\s*([\s\S]*?)-->\s*/);
  if (!m) throw new Error(`${file}: missing <!--meta {...}--> block at the top`);
  const meta = JSON.parse(m[1]);
  if (meta.home) meta.jsonld = ORG_LD;
  const ctx = { meta, file };
  const body = render(src.slice(m[0].length), ctx);
  const html = `<!doctype html>
<html lang="en">
<head>
  ${head(meta)}
</head>

<body>
  <a class="skip-link" href="#main">Skip to main content</a>

  ${header(meta.nav)}

  <main id="main">
${body.trim()}
  </main>

  ${footer()}

  <script src="/js/site-config.js"></script>
  <script src="/js/atherbyte-account.js"></script>
  <script src="/js/main.js"></script>
</body>
</html>
`;
  const out = join(ROOT, meta.path.replace(/^\//, ""), "index.html");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  return meta;
}

/* ---------- keep hand-written pages in sync ---------- */
function syncPage(rel) {
  const file = join(ROOT, rel);
  if (!existsSync(file)) return;
  let html = readFileSync(file, "utf8");
  const current = rel.startsWith("account") ? "account" : rel.startsWith("games") ? "games" : "";
  html = html.replace(/<header class="site-header">[\s\S]*?<\/header>/, () => header(current));
  html = html.replace(/<footer class="site-footer">[\s\S]*?<\/footer>/, () => footer());
  /* The old games list script is gone; the shared scripts replace it. */
  html = html.replace(/\s*<script src="\/js\/games-data\.js"><\/script>/g, "");
  writeFileSync(file, html);
}

/* ---------- sitemap ---------- */
function sitemap(metas) {
  const urls = metas.filter((m) => !m.noindex).map((m) => m.path);
  /* The games themselves live in their own repositories but are part of the site, so they stay listed. */
  const extra = ["/games/grid-snake/", "/games/stop-the-timer/", "/grid-snake/", "/Feel-the-time/"];
  const all = [...new Set([...urls, ...extra])];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${all.map((p) => `  <url>\n    <loc>${SITE.origin}${p}</loc>\n  </url>`).join("\n")}
</urlset>
`;
}

/* ---------- run ---------- */
const metas = readdirSync(PAGES_DIR).filter((f) => f.endsWith(".html")).sort().map(buildPage);
SYNCED_PAGES.forEach(syncPage);
writeFileSync(join(ROOT, "sitemap.xml"), sitemap(metas));
console.log(`Built ${metas.length} pages, synced ${SYNCED_PAGES.length} pages, wrote sitemap.xml`);
