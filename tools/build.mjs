/*
  tools/build.mjs: writes every page of the website in English and Arabic. No dependencies; Node 18+.

    node tools/build.mjs

  Words live in content/copy.en.mjs and content/copy.ar.mjs, facts in content/site.mjs.
  English pages are written at their normal address (/products/), Arabic pages under /ar/ (/ar/products/).
  GitHub Pages publishes the committed files as they are: run this after any change and commit the result.
*/
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SITE, LANGS, PRODUCTS, PAGES, SYNCED_PAGES } from "../content/site.mjs";
import { ACCOUNT_INDEX, ACCOUNT_RESET } from "../content/account.ar.mjs";
import en from "../content/copy.en.mjs";
import ar from "../content/copy.ar.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const COPY = { en, ar };
const PROD = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const linkEmails = (html) => html.replaceAll(SITE.email, `<a href="mailto:${SITE.email}">${SITE.email}</a>`);
const url = (lang, path) => LANGS[lang].prefix + path;
const abs = (lang, path) => SITE.origin + url(lang, path);
const mailto = (subject) => `mailto:${SITE.email}?subject=${encodeURIComponent(subject)}`;

const ICONS = {
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  window: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9h18"/><circle cx="6.2" cy="6.5" r=".6" fill="currentColor"/><circle cx="8.6" cy="6.5" r=".6" fill="currentColor"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  cube: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="3"/><path d="m3 7 9 6 9-6"/>',
  instagram: '<rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>',
  facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>'
};
const icon = (name, size = 20) =>
  `<svg class="icon" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`;

/* ---------- products ---------- */
const badge = (t, p) => `<span class="badge badge-${p.tone}"><span class="badge-dot" aria-hidden="true"></span>${esc(t.status[p.status])}</span>`;

function sceneFor(t, p, c, eager) {
  const loading = eager ? 'fetchpriority="high"' : 'loading="lazy"';
  if (p.kind === "saas") {
    return `<div class="scene scene-saas">
        <span class="layer layer-grid" aria-hidden="true"></span>
        <div class="layer layer-window">
          <div class="win-bar" aria-hidden="true"><i></i><i></i><i></i><span>queue.atherbyte.online</span></div>
          <img src="${p.image.src}" alt="${esc(c.alt)}" width="${p.image.w}" height="${p.image.h}" ${loading} decoding="async">
        </div>
        <span class="layer layer-floor" aria-hidden="true"></span>
        <div class="layer layer-ticket" aria-hidden="true"><i></i><b></b><b></b></div>
        <span class="layer layer-chip layer-chip-a" aria-hidden="true"></span>
        <span class="layer layer-chip layer-chip-b" aria-hidden="true"></span>
      </div><span class="pcard-label">${esc(t.ui.illustrative)}</span>`;
  }
  if (p.kind === "game") {
    return `<div class="scene scene-game">
        <span class="layer layer-orb" aria-hidden="true"></span>
        <img class="layer layer-shot layer-shot-back" src="${p.image2.src}" alt="${esc(c.alt2)}" width="${p.image2.w}" height="${p.image2.h}" loading="lazy" decoding="async">
        <img class="layer layer-shot layer-shot-front" src="${p.image.src}" alt="${esc(c.alt)}" width="${p.image.w}" height="${p.image.h}" ${loading} decoding="async">
        <span class="layer layer-glare" aria-hidden="true"></span>
      </div>`;
  }
  return `<div class="scene scene-concept" role="img" aria-label="${esc(c.alt)}">
        <span class="layer layer-grid" aria-hidden="true"></span>
        <span class="layer layer-orbit" aria-hidden="true"></span>
        <div class="layer layer-code" aria-hidden="true"><span>?</span><span>?</span><span>?</span><span>?</span></div>
        <ul class="layer layer-clues" aria-hidden="true"><li><i></i><b></b></li><li><i></i><b></b></li><li><i></i><b></b></li><li><i></i><b></b></li></ul>
      </div><span class="pcard-label">${esc(t.ui.concept)}</span>`;
}

function productCard(lang, id, { level = 3, feature = false, eager = false } = {}) {
  const t = COPY[lang], p = PROD[id], c = t.product[id];
  const href = p.url ? p.url : "";
  const ext = p.external ? ' target="_blank" rel="noopener noreferrer"' : "";
  const title = href
    ? `<a class="pcard-link" href="${href}"${ext}${p.kind === "game" ? " data-play" : ""}>${esc(c.title)}${p.external ? `<span class="visually-hidden"> ${esc(t.ui.opensNewTab)}</span>` : ""}</a>`
    : esc(c.title);
  const actions = [];
  if (href) actions.push(`<a class="btn btn-primary has-arrow" href="${href}"${ext}>${esc(c.cta)}${p.external ? `<span class="visually-hidden"> ${esc(t.ui.opensNewTab)}</span>` : ""}</a>`);
  if (p.page) actions.push(`<a class="btn btn-secondary" href="${url(lang, p.page)}">${esc(t.ui.details)}<span class="visually-hidden"> ${esc(t.ui.detailsAbout)} ${esc(c.title)}</span></a>`);
  const foot = actions.length ? `<div class="pcard-actions">${actions.join("")}</div>` : `<p class="pcard-note">${esc(t.ui.comingSoon)}</p>`;
  return `<article class="pcard pcard-${p.kind}${feature ? " pcard-feature" : ""} reveal" data-status="${p.status}" data-product="${p.id}">
      <div class="pcard-stage" data-tilt>${sceneFor(t, p, c, eager)}</div>
      <div class="pcard-body">
        <div class="pcard-meta">${badge(t, p)}<span class="pcard-cat">${esc(c.category)}</span></div>
        <h${level} class="pcard-title">${title}</h${level}>
        <p class="pcard-text">${esc(c.summary)}</p>
        <ul class="tag-list">${c.tags.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
        ${foot}
      </div>
    </article>`;
}

const grid = (lang, ids, opts = {}) => `<div class="pgrid">${ids.map((id, i) => productCard(lang, id, { ...opts, feature: (opts.featureFirst && i === 0) || (opts.featureLast && i === ids.length - 1), eager: opts.eagerFirst && i === 0 })).join("\n")}</div>`;

/* ---------- shared blocks ---------- */
function crumbs(lang, items) {
  const t = COPY[lang];
  const li = items.map(([label, href], i) => (i === items.length - 1 ? `<li aria-current="page">${esc(label)}</li>` : `<li><a href="${href}">${esc(label)}</a></li>`));
  return `<nav aria-label="${esc(t.ui.breadcrumb)}"><ol class="breadcrumb">${li.join("")}</ol></nav>`;
}
const homeCrumb = (lang) => [COPY[lang].ui.home, url(lang, "/")];

function pageHero(lang, crumbList, eyebrow, h1, lead, extra = "") {
  return `<section class="page-hero" aria-labelledby="page-title">
  <div class="container">
    ${crumbs(lang, crumbList)}
    <p class="eyebrow">${esc(eyebrow)}</p>
    <h1 class="section-title" id="page-title">${esc(h1)}</h1>
    ${lead ? `<p class="section-lead">${esc(lead)}</p>` : ""}${extra}
  </div>
</section>`;
}

const sectionHead = (eyebrow, title, id, lead = "") => `<div class="section-head reveal">
      <p class="eyebrow">${esc(eyebrow)}</p>
      <h2 class="section-title" id="${id}">${esc(title)}</h2>${lead ? `\n      <p class="section-lead">${esc(lead)}</p>` : ""}
    </div>`;

function ctaBand(lang, title, lead, b1, b1href, b2, b2href) {
  return `<section class="section" aria-labelledby="cta-title">
  <div class="container">
    <div class="cta-band reveal">
      <h2 class="section-title" id="cta-title">${esc(title)}</h2>
      <p class="section-lead">${esc(lead)}</p>
      <div class="hero-actions">
        <a class="btn btn-primary has-arrow" href="${b1href}">${esc(b1)}</a>${b2 ? `\n        <a class="btn btn-secondary" href="${b2href}">${esc(b2)}</a>` : ""}
      </div>
    </div>
  </div>
</section>`;
}

const pillars = (items) => `<ul class="pillars">${items.map((i) => `<li class="reveal"><h3>${esc(i.h)}</h3><p>${esc(i.p)}</p></li>`).join("")}</ul>`;

function socialList(lang) {
  const t = COPY[lang];
  const items = [
    `<li><a href="mailto:${SITE.email}" aria-label="${esc(t.ui.emailUs)}">${icon("mail")}<span>${esc(t.ui.emailUs)}</span></a></li>`,
    ...SITE.social.map((s) => `<li><a href="${s.href}" target="_blank" rel="noopener noreferrer" aria-label="${s.label} ${esc(t.ui.opensNewTab)}">${icon(s.id)}<span>${s.label}</span></a></li>`)
  ];
  return `<ul class="social-list">${items.join("")}</ul>`;
}

/* ---------- header / footer ---------- */
const NAV_KEYS = [["products", "/products/"], ["services", "/services/"], ["about", "/about/"], ["contact", "/contact/"]];

function header(lang, current, altHref, { account = false } = {}) {
  const t = COPY[lang], other = lang === "en" ? "ar" : "en";
  const links = NAV_KEYS.map(([k, p]) => `<li><a href="${url(lang, p)}"${k === current ? ' aria-current="page"' : ""}>${esc(t.nav[k])}</a></li>`).join("\n          ");
  const sw = altHref
    ? `<a class="lang-switch" href="${altHref}" hreflang="${other}" lang="${other}" data-lang="${other}" aria-label="${esc(t.lang.switchLabel)}">${icon("globe", 16)}<span>${esc(t.lang.switchTo)}</span></a>`
    : "";
  return `<header class="site-header">
    <div class="container header-inner">
      <a class="brand" href="${url(lang, "/")}" aria-label="Atherbyte Studio, ${esc(t.ui.home)}">
        <img src="/assets/images/atherbyte-mark.webp" alt="" width="40" height="40">
        <span class="brand-name">Atherbyte <span>Studio</span></span>
      </a>

      <button class="nav-toggle" type="button" aria-label="${esc(t.ui.openMenu)}" data-open="${esc(t.ui.openMenu)}" data-close="${esc(t.ui.closeMenu)}" aria-expanded="false" aria-controls="site-nav">
        <span class="bar"></span><span class="bar"></span><span class="bar"></span>
      </button>

      <nav class="site-nav" id="site-nav" aria-label="${esc(t.ui.menuLabel)}">
        <ul class="nav-list">
          ${links}
        </ul>
        <div class="nav-tools">
          ${sw}
          <a class="nav-account" href="${url(lang, "/account/")}"${account ? ' aria-current="page"' : ""} data-signin="${esc(t.nav.signIn)}" data-account-link>${icon("user", 18)}<span>${esc(t.nav.account)}</span></a>
        </div>
      </nav>
    </div>
  </header>`;
}

function footer(lang) {
  const t = COPY[lang], f = t.footer;
  const li = (p, label) => `<li><a href="${url(lang, p)}">${esc(label)}</a></li>`;
  return `<footer class="site-footer">
    <div class="container footer-grid">
      <div class="footer-brand">
        <a class="brand" href="${url(lang, "/")}" aria-label="Atherbyte Studio, ${esc(t.ui.home)}">
          <img src="/assets/images/atherbyte-mark.webp" alt="" width="40" height="40" loading="lazy">
          <span class="brand-name">Atherbyte <span>Studio</span></span>
        </a>
        <p>${esc(f.blurb)}</p>
      </div>

      <nav aria-label="${esc(t.ui.footerProducts)}">
        <p class="footer-heading">${esc(f.products)}</p>
        <ul class="footer-links">${li("/products/", f.allProducts)}${li("/games/", f.games)}${li("/saas/", f.saas)}${li("/portfolio/", f.portfolio)}</ul>
      </nav>

      <nav aria-label="${esc(t.ui.footerStudio)}">
        <p class="footer-heading">${esc(f.studio)}</p>
        <ul class="footer-links">${li("/services/", f.services)}${li("/about/", f.about)}${li("/contact/", f.contact)}${li("/account/", f.account)}</ul>
      </nav>

      <div>
        <p class="footer-heading">${esc(t.ui.onlineHeading)}</p>
        ${socialList(lang)}
      </div>
    </div>

    <div class="container footer-bottom">
      <p>&copy; <span data-year>2026</span> Atherbyte Studio. ${esc(t.ui.rights)}</p>
      <nav aria-label="${esc(t.ui.footerLegal)}"><a href="${url(lang, "/privacy/")}">${esc(f.privacy)}</a></nav>
    </div>
  </footer>`;
}

/* ---------- <head> ---------- */
function head(lang, meta) {
  const L = LANGS[lang], other = lang === "en" ? "ar" : "en";
  const canonical = abs(lang, meta.path);
  const title = esc(meta.title), desc = esc(meta.description);
  const img = SITE.origin + SITE.ogImage;
  const alt = meta.indexable === false ? "" : `
  <link rel="alternate" hreflang="en" href="${abs("en", meta.path)}">
  <link rel="alternate" hreflang="ar" href="${abs("ar", meta.path)}">
  <link rel="alternate" hreflang="x-default" href="${abs("en", meta.path)}">`;
  const ld = meta.jsonld ? `\n  <script type="application/ld+json">${JSON.stringify(meta.jsonld)}</script>` : "";
  const preload = meta.preload ? `\n  <link rel="preload" as="style" href="/css/styles.css">` : "";
  return `<meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <meta name="description" content="${desc}">${meta.noindex ? '\n  <meta name="robots" content="noindex">' : ""}
  <meta name="google-adsense-account" content="ca-pub-3219161174659178">
  <meta name="theme-color" content="#07060B">
  <meta name="color-scheme" content="dark">
  <link rel="canonical" href="${canonical}">${alt}
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3219161174659178" crossorigin="anonymous"></script>

  <link rel="icon" href="/favicon.ico" sizes="48x48">
  <link rel="icon" href="/assets/images/favicon.png" type="image/png" sizes="192x192">
  <link rel="apple-touch-icon" href="/assets/images/apple-touch-icon.png">

  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Atherbyte Studio">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${desc}">
  <meta property="og:locale" content="${L.locale}">
  <meta property="og:locale:alternate" content="${LANGS[other].locale}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${img}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Atherbyte Studio logo on a dark background">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${desc}">
  <meta name="twitter:image" content="${img}">${ld}

  <script>document.documentElement.classList.add("js");</script>
  <link rel="stylesheet" href="/css/styles.css">`;
}

const orgLd = (lang) => ({
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": SITE.origin + "/#organization", name: SITE.name, url: SITE.origin + "/", logo: SITE.origin + "/assets/images/apple-touch-icon.png",
      description: "Atherbyte Studio is an independent digital products company building SaaS products, browser games and custom software.", email: SITE.email, sameAs: SITE.social.map((s) => s.href) },
    { "@type": "WebSite", "@id": SITE.origin + "/#website", url: SITE.origin + "/", name: SITE.name, inLanguage: ["en", "ar"], publisher: { "@id": SITE.origin + "/#organization" } }
  ]
});

/* ---------- pages ---------- */
const heroSvg = `<svg class="hero-svg" viewBox="0 0 800 800" aria-hidden="true" focusable="false"><defs><radialGradient id="hg" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#885CFF" stop-opacity=".55"/><stop offset="1" stop-color="#885CFF" stop-opacity="0"/></radialGradient></defs><circle cx="400" cy="400" r="330" fill="url(#hg)"/><g fill="none" stroke="#B79CFF" stroke-width="1.2" stroke-linejoin="round"><g class="hs-a" opacity=".85"><polygon points="400,110 640,250 640,550 400,690 160,550 160,250"/><polyline points="400,110 400,400 640,250 400,400 160,250 400,400 400,690 400,400 640,550 400,400 160,550"/></g><g class="hs-b" opacity=".5"><polygon points="400,200 560,300 560,500 400,600 240,500 240,300"/></g><g class="hs-c" opacity=".35"><circle cx="400" cy="400" r="290"/><circle cx="400" cy="400" r="215" stroke-dasharray="3 9"/></g></g></svg>`;

const PAGE = {
  home(lang) {
    const t = COPY[lang], h = t.home;
    const hero = `<section class="hero" id="top" aria-labelledby="hero-title" data-hero>
  <div class="hero-bg" aria-hidden="true">
    <div class="hero-fallback">${heroSvg}</div>
    <canvas class="hero-canvas" data-hero-canvas width="1" height="1" aria-label="${esc(h.hero.canvasLabel)}"></canvas>
  </div>
  <div class="container hero-inner">
    <p class="eyebrow">${esc(h.hero.eyebrow)}</p>
    <h1 id="hero-title">${esc(h.hero.title)}</h1>
    <p class="hero-lead">${esc(h.hero.lead)}</p>
    <div class="hero-actions">
      <a class="btn btn-primary has-arrow" href="#products">${esc(h.hero.cta1)}</a>
      <a class="btn btn-secondary" href="${url(lang, "/contact/")}">${esc(h.hero.cta2)}</a>
    </div>
    <p class="hero-note">${esc(h.hero.note)}</p>
  </div>
</section>`;
    const services = t.services.items.map((s, i) => `<article class="service-card reveal" data-glow>
        <span class="service-num" aria-hidden="true">0${i + 1}</span>
        <div class="service-icon" aria-hidden="true">${icon(s.icon, 24)}</div>
        <h3>${esc(s.h)}</h3>
        <p>${esc(s.p)}</p>
      </article>`).join("\n");
    return `${hero}

<section class="section" id="products" aria-labelledby="products-title">
  <div class="container">
    ${sectionHead(h.featured.eyebrow, h.featured.title, "products-title", h.featured.lead)}
    ${grid(lang, ["atherbyte-queue", "grid-snake", "stop-the-timer", "mind-clash"], { level: 3, featureFirst: true, featureLast: true })}
  </div>
</section>

<section class="section section-alt" id="philosophy" aria-labelledby="philosophy-title">
  <div class="container">
    ${sectionHead(h.philosophy.eyebrow, h.philosophy.title, "philosophy-title", h.philosophy.lead)}
    <ol class="philo">${h.philosophy.items.map((i, n) => `<li class="reveal"><span class="philo-n" aria-hidden="true">0${n + 1}</span><h3>${esc(i.h)}</h3><p>${esc(i.p)}</p></li>`).join("")}</ol>
  </div>
</section>

<section class="section" id="services" aria-labelledby="services-title">
  <div class="container">
    ${sectionHead(h.services.eyebrow, h.services.title, "services-title", h.services.lead)}
    <div class="service-grid">${services}</div>
    <p class="section-more reveal"><a class="link-arrow" href="${url(lang, "/services/")}">${esc(h.services.all)}</a></p>
  </div>
</section>

<section class="section section-alt" id="process" aria-labelledby="process-title">
  <div class="container">
    ${sectionHead(h.process.eyebrow, h.process.title, "process-title", h.process.lead)}
    <ol class="steps-line">${h.process.steps.map((s, i) => `<li class="reveal"><span class="step-n" aria-hidden="true">${i + 1}</span><h3>${esc(s.h)}</h3><p>${esc(s.p)}</p></li>`).join("")}</ol>
  </div>
</section>

<section class="section" id="craft" aria-labelledby="craft-title">
  <div class="container">
    ${sectionHead(h.craft.eyebrow, h.craft.title, "craft-title", h.craft.lead)}
    <div class="craft-grid">${h.craft.items.map((i) => `<article class="craft-card reveal" data-glow><h3>${esc(i.h)}</h3><p>${esc(i.p)}</p></article>`).join("")}</div>
    <ul class="chips reveal">${h.craft.principles.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
  </div>
</section>

<section class="section section-alt" id="about" aria-labelledby="about-title">
  <div class="container split">
    <div class="reveal">
      <p class="eyebrow">${esc(h.about.eyebrow)}</p>
      <h2 class="section-title" id="about-title">${esc(h.about.title)}</h2>
      <p class="section-lead">${esc(h.about.p1)}</p>
      <p class="section-lead about-second">${esc(h.about.p2)}</p>
      <p class="section-more"><a class="link-arrow" href="${url(lang, "/about/")}">${esc(h.about.link)}</a></p>
    </div>
    <div class="about-mark reveal" aria-hidden="true"><img src="/assets/images/atherbyte-logo-lockup.webp" alt="" width="900" height="787" loading="lazy" decoding="async"></div>
  </div>
</section>

<section class="section" id="contact" aria-labelledby="cta-title">
  <div class="container">
    <div class="cta-band cta-band-lg reveal">
      <h2 class="section-title" id="cta-title">${esc(h.cta.title)}</h2>
      <p class="section-lead">${esc(h.cta.lead)}</p>
      <div class="hero-actions">
        <a class="btn btn-primary has-arrow" href="${url(lang, "/contact/")}">${esc(h.cta.b1)}</a>
        <a class="btn btn-secondary" href="${url(lang, "/services/")}">${esc(h.cta.b2)}</a>
      </div>
      <p class="contact-note">${esc(t.contact.direct)} <a href="mailto:${SITE.email}">${SITE.email}</a></p>
    </div>
  </div>
</section>`;
  },

  products(lang) {
    const t = COPY[lang], p = t.products, c = t.contact;
    return `${pageHero(lang, [homeCrumb(lang), [t.footer.allProducts]], p.eyebrow, p.h1, p.lead)}
<section class="section" aria-labelledby="saas-title">
  <div class="container">
    <h2 class="visually-hidden" id="saas-title">${esc(p.saas)}</h2>
    ${grid(lang, ["atherbyte-queue"], { level: 3, featureFirst: true, eagerFirst: true })}
  </div>
</section>
<section class="section section-alt" aria-labelledby="games-title">
  <div class="container">
    ${sectionHead(p.games, p.gamesLead, "games-title")}
    ${grid(lang, ["grid-snake", "stop-the-timer", "mind-clash"], { level: 3, featureLast: true })}
  </div>
</section>
${ctaBand(lang, t.home.cta.title, t.home.cta.lead, t.home.cta.b1, url(lang, "/contact/"), t.home.cta.b2, url(lang, "/services/"))}`;
  },

  games(lang) {
    const t = COPY[lang], g = t.games;
    return `${pageHero(lang, [homeCrumb(lang), [t.footer.games]], g.eyebrow, g.h1, g.lead)}
<section class="section" aria-labelledby="play-title">
  <div class="container">
    <h2 class="visually-hidden" id="play-title">${esc(g.eyebrow)}</h2>
    ${grid(lang, ["grid-snake", "stop-the-timer"], { level: 3, eagerFirst: true })}
  </div>
</section>
<section class="section section-alt" aria-labelledby="soon-title">
  <div class="container">
    ${sectionHead(g.soon, g.soonLead, "soon-title")}
    ${grid(lang, ["mind-clash"], { level: 3, featureFirst: true })}
    <ul class="check-list reveal">${t.product["mind-clash"].planned.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
  </div>
</section>
${ctaBand(lang, t.home.cta.title, t.home.cta.lead, t.home.cta.b1, url(lang, "/contact/"), t.home.cta.b2, url(lang, "/services/"))}`;
  },

  saas(lang) {
    const t = COPY[lang], s = t.saas;
    return `${pageHero(lang, [homeCrumb(lang), [t.footer.saas]], s.eyebrow, s.h1, s.lead)}
<section class="section" aria-labelledby="live-title">
  <div class="container">
    <h2 class="visually-hidden" id="live-title">${esc(s.eyebrow)}</h2>
    ${grid(lang, ["atherbyte-queue"], { level: 3, featureFirst: true, eagerFirst: true })}
  </div>
</section>
<section class="section section-alt" aria-labelledby="how-title">
  <div class="container">
    ${sectionHead(s.eyebrow, s.howTitle, "how-title")}
    ${pillars(s.how)}
    <p class="legend reveal">${esc(s.note)}</p>
  </div>
</section>
${ctaBand(lang, s.ctaTitle, s.ctaLead, s.ctaBtn, url(lang, "/services/"))}`;
  },

  portfolio(lang) {
    const t = COPY[lang], p = t.portfolio;
    return `${pageHero(lang, [homeCrumb(lang), [t.footer.portfolio]], p.eyebrow, p.h1, p.lead)}
<section class="section" aria-labelledby="rel-title">
  <div class="container">
    ${sectionHead(p.released, t.products.h1, "rel-title")}
    ${grid(lang, ["atherbyte-queue", "grid-snake", "stop-the-timer"], { level: 3, featureFirst: true, eagerFirst: true })}
  </div>
</section>
<section class="section section-alt" aria-labelledby="dev-title">
  <div class="container">
    ${sectionHead(p.building, t.games.soon, "dev-title")}
    ${grid(lang, ["mind-clash"], { level: 3, featureFirst: true })}
  </div>
</section>
<section class="section" aria-labelledby="client-title">
  <div class="container">
    ${sectionHead(p.clients, p.clientsLead, "client-title")}
  </div>
</section>
${ctaBand(lang, p.ctaTitle, t.home.cta.lead, p.ctaBtn, url(lang, "/contact/"), t.home.cta.b2, url(lang, "/services/"))}`;
  },

  services(lang) {
    const t = COPY[lang], s = t.services;
    const cards = s.items.map((i, n) => `<article class="svc reveal" id="${i.id}" data-glow>
      <div class="svc-head"><span class="service-num" aria-hidden="true">0${n + 1}</span><div class="service-icon" aria-hidden="true">${icon(i.icon, 24)}</div></div>
      <h3>${esc(i.h)}</h3>
      <p class="svc-lead">${esc(i.p)}</p>
      <p class="svc-label">${esc(s.scopeLabel)}</p>
      <ul class="check-list">${i.scope.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
      <p class="svc-label">${esc(s.valueLabel)}</p>
      <p class="svc-value">${esc(i.value)}</p>
    </article>`).join("\n");
    return `${pageHero(lang, [homeCrumb(lang), [t.nav.services]], s.eyebrow, s.h1, s.lead, `<div class="hero-actions"><a class="btn btn-primary has-arrow" href="${url(lang, "/contact/")}">${esc(s.ctaBtn)}</a></div>`)}
<section class="section" aria-labelledby="svc-title">
  <div class="container">
    <h2 class="visually-hidden" id="svc-title">${esc(s.eyebrow)}</h2>
    <div class="svc-grid">${cards}</div>
  </div>
</section>
<section class="section section-alt" aria-labelledby="how-title">
  <div class="container">
    ${sectionHead(t.home.process.eyebrow, s.howTitle, "how-title", s.howLead)}
    <ol class="steps-line">${t.home.process.steps.map((x, i) => `<li class="reveal"><span class="step-n" aria-hidden="true">${i + 1}</span><h3>${esc(x.h)}</h3><p>${esc(x.p)}</p></li>`).join("")}</ol>
  </div>
</section>
${ctaBand(lang, s.ctaTitle, t.home.cta.lead, s.ctaBtn, url(lang, "/contact/"))}`;
  },

  about(lang) {
    const t = COPY[lang], a = t.about;
    return `${pageHero(lang, [homeCrumb(lang), [t.nav.about]], a.eyebrow, a.h1, a.lead)}
<section class="section" aria-labelledby="focus-title">
  <div class="container split">
    <div class="reveal">
      <h2 class="section-title" id="focus-title">${esc(a.whatTitle)}</h2>
      <p class="section-lead">${esc(a.p1)}</p>
      <p class="section-lead about-second">${esc(a.p2)}</p>
    </div>
    <ul class="focus-list">${a.focus.map((f) => `<li class="focus-item reveal"><h3>${esc(f.h)}</h3><p>${esc(f.p)}</p></li>`).join("")}</ul>
  </div>
</section>
<section class="section section-alt" aria-labelledby="values-title">
  <div class="container">
    ${sectionHead(t.home.philosophy.eyebrow, a.valuesTitle, "values-title")}
    ${pillars(a.values)}
  </div>
</section>
${ctaBand(lang, a.ctaTitle, a.ctaLead, a.ctaBtn, url(lang, "/contact/"), t.nav.products, url(lang, "/products/"))}`;
  },

  contact(lang) {
    const t = COPY[lang], c = t.contact, f = c.f;
    const opts = (o) => Object.entries(o).map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join("");
    const msgs = JSON.stringify({ ...c.msg, sending: f.sending, send: f.send }).replace(/</g, "\\u003c");
    return `${pageHero(lang, [homeCrumb(lang), [t.nav.contact]], c.eyebrow, c.h1, c.lead)}
<section class="section" aria-labelledby="form-title">
  <div class="container contact-grid">
    <div class="form-card reveal">
      <h2 class="card-heading" id="form-title">${esc(c.formTitle)}</h2>
      <form id="contact-form" class="cform" method="post" action="/contact/" novalidate data-lang="${lang}">
        <div class="field"><label for="cf-name">${esc(f.name)} <span class="req">*</span></label><input id="cf-name" name="name" type="text" autocomplete="name" maxlength="100" required aria-describedby="cf-name-err"><p class="field-err" id="cf-name-err" hidden></p></div>
        <div class="field"><label for="cf-email">${esc(f.email)} <span class="req">*</span></label><input id="cf-email" name="email" type="email" autocomplete="email" inputmode="email" maxlength="254" required dir="ltr" aria-describedby="cf-email-err"><p class="field-err" id="cf-email-err" hidden></p></div>
        <div class="field"><label for="cf-type">${esc(f.type)} <span class="req">*</span></label><select id="cf-type" name="type" required aria-describedby="cf-type-err">${opts(c.types)}</select><p class="field-err" id="cf-type-err" hidden></p></div>
        <div class="field"><label for="cf-desc">${esc(f.desc)} <span class="req">*</span></label><textarea id="cf-desc" name="description" rows="5" maxlength="3000" required aria-describedby="cf-desc-hint cf-desc-err"></textarea><p class="field-hint" id="cf-desc-hint">${esc(f.descHint)}</p><p class="field-err" id="cf-desc-err" hidden></p></div>
        <div class="field-row">
          <div class="field"><label for="cf-budget">${esc(f.budget)}</label><select id="cf-budget" name="budget">${opts(c.budgets)}</select></div>
          <div class="field"><label for="cf-method">${esc(f.method)}</label><select id="cf-method" name="method">${opts(c.methods)}</select></div>
        </div>
        <div class="field"><label for="cf-link">${esc(f.link)}</label><input id="cf-link" name="link" type="url" inputmode="url" maxlength="300" dir="ltr" placeholder="https://" aria-describedby="cf-link-hint cf-link-err"><p class="field-hint" id="cf-link-hint">${esc(f.linkHint)}</p><p class="field-err" id="cf-link-err" hidden></p></div>
        <div class="hp" aria-hidden="true"><label for="cf-web">Website</label><input id="cf-web" name="website" type="text" tabindex="-1" autocomplete="off"></div>
        <div class="captcha" id="cf-captcha"></div>
        <p class="form-status" id="cf-status" role="status" aria-live="polite" hidden></p>
        <button class="btn btn-primary" type="submit" id="cf-send"><span class="btn-label">${esc(f.send)}</span></button>
        <p class="form-consent">${esc(f.consent)} <a href="${url(lang, "/privacy/")}">${esc(f.privacy)}</a>.</p>
      </form>
      <script type="application/json" id="cf-msgs">${msgs}</script>
    </div>

    <aside class="direct reveal" aria-labelledby="direct-title">
      <h2 class="card-heading" id="direct-title">${esc(c.direct)}</h2>
      <p>${esc(c.directLead)}</p>
      <div id="contact-fallback"><div class="contact-actions"><a class="btn btn-secondary" href="${mailto("Project inquiry for Atherbyte Studio")}">${icon("mail", 18)}${esc(t.ui.emailUs)}</a></div>
      <p class="contact-note"><span class="contact-email" dir="ltr">${SITE.email}</span></p></div>
      <p class="social-label">${esc(c.find)}</p>
      ${socialList(lang)}
    </aside>
  </div>
</section>`;
  },

  privacy(lang) {
    const t = COPY[lang], p = t.privacy;
    const date = new Date(SITE.privacyDate + "T00:00:00Z").toLocaleDateString(lang === "ar" ? "ar-u-nu-latn" : "en-GB", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
    const body = (b) => b.map((x) => (x.p ? `<p>${linkEmails(esc(x.p))}</p>` : x.h3 ? `<h3>${esc(x.h3)}</h3>` : `<ul>${x.ul.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`)).join("\n");
    return `${pageHero(lang, [homeCrumb(lang), [t.footer.privacy]], p.eyebrow, p.h1, p.lead, `<p class="legal-date"><strong>${esc(p.effective)}:</strong> <time datetime="${SITE.privacyDate}">${date}</time></p>`)}
<section class="section legal" aria-label="${esc(p.h1)}">
  <div class="container legal-grid">
    <nav class="toc" aria-labelledby="toc-title"><p class="toc-title" id="toc-title">${esc(p.toc)}</p><ol>${p.sections.map((s) => `<li><a href="#${s.id}">${esc(s.h.replace(/^\d+\.\s*/, ""))}</a></li>`).join("")}</ol></nav>
    <div class="prose">
      ${p.sections.map((s) => `<section id="${s.id}" aria-labelledby="${s.id}-h"><h2 id="${s.id}-h">${esc(s.h)}</h2>\n${body(s.body)}</section>`).join("\n")}
      <p class="legal-date">${esc(p.updated)} <time datetime="${SITE.privacyDate}">${date}</time>.</p>
    </div>
  </div>
</section>`;
  },

  game(lang, id) {
    const t = COPY[lang], g = t.gamePages[id], s = t.gamePages.shared, p = PROD[id], c = t.product[id];
    const play = (cls) => `<a class="btn ${cls} has-arrow" href="${p.url}" data-play>${esc(s.play)}<span class="visually-hidden"> ${esc(c.title)}</span></a>`;
    const otherId = id === "grid-snake" ? "stop-the-timer" : "grid-snake";
    return `<section class="section game-hero" aria-labelledby="game-title">
  <div class="container">
    ${crumbs(lang, [homeCrumb(lang), [t.footer.games, url(lang, "/games/")], [c.title]])}
    <div class="game-hero-grid">
      <div class="game-hero-copy">
        <span class="chip">${esc(c.category)}</span>
        <h1 class="section-title" id="game-title">${esc(c.title)}</h1>
        <p class="section-lead">${esc(g.lead)}</p>
        <div class="hero-actions">${play("btn-primary")}<a class="btn btn-secondary" href="${url(lang, "/games/")}">${esc(s.allGames)}</a></div>
      </div>
      <figure class="shot"><img src="${p.image.src}" alt="${esc(c.alt)}" width="1280" height="800" fetchpriority="high" decoding="async"></figure>
    </div>
  </div>
</section>
<section class="section section-alt" aria-labelledby="howto-title">
  <div class="container howto-grid">
    <div>
      ${sectionHead(s.howEyebrow, s.howTitle, "howto-title")}
      <ol class="steps">${g.steps.map((x) => `<li class="reveal"><strong>${esc(x.h)}</strong> ${esc(x.p)}</li>`).join("")}</ol>
    </div>
    <figure class="shot reveal"><img src="${p.image2.src}" alt="${esc(c.alt2)}" width="1280" height="800" loading="lazy" decoding="async"><figcaption>${esc(g.stepsCaption)}</figcaption></figure>
  </div>
</section>
<section class="section" aria-labelledby="items-title">
  <div class="container">
    ${sectionHead(s.insideEyebrow, g.insideTitle, "items-title", g.insideLead)}
    ${pillars(g.inside)}
  </div>
</section>
<section class="section section-alt" aria-labelledby="know-title">
  <div class="container">
    ${sectionHead(s.knowEyebrow, s.knowTitle, "know-title")}
    <ul class="focus-list know-list">${g.know.map((x) => `<li class="focus-item reveal"><p>${esc(x)}</p></li>`).join("")}</ul>
  </div>
</section>
<section class="section" aria-labelledby="cta-title">
  <div class="container">
    <div class="cta-band reveal">
      <p class="eyebrow">${esc(s.ctaEyebrow)}</p>
      <h2 class="section-title" id="cta-title">${esc(c.cta)}</h2>
      <p class="section-lead">${esc(s.ctaLead)}</p>
      <div class="hero-actions">${play("btn-primary")}<a class="btn btn-secondary" href="${url(lang, PAGES.find((x) => x.product === otherId).path)}">${esc(g.other)}</a></div>
      <p class="contact-note">${esc(s.bug)} <a href="mailto:${SITE.email}">${SITE.email}</a>.</p>
    </div>
  </div>
</section>`;
  }
};

function gameLd(lang, id, meta) {
  const t = COPY[lang], p = PROD[id], page = abs(lang, meta.path);
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": page, url: page, name: meta.title, description: meta.description, inLanguage: lang, isPartOf: { "@type": "WebSite", name: "Atherbyte Studio", url: SITE.origin + "/" },
        about: { "@type": "VideoGame", name: t.product[id].title, url: p.url, gamePlatform: "Web browser", applicationCategory: "Game", isAccessibleForFree: true } },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: t.ui.home, item: abs(lang, "/") },
        { "@type": "ListItem", position: 2, name: t.footer.games, item: abs(lang, "/games/") },
        { "@type": "ListItem", position: 3, name: t.product[id].title, item: page } ] }
    ]
  };
}

/* ---------- assemble ---------- */
const SCRIPTS = (extra = "") => `<script src="/js/site-config.js"></script>
  <script src="/js/atherbyte-account.js"></script>
  <script src="/js/main.js"></script>${extra}`;

function buildPage(lang, page) {
  const t = COPY[lang], L = LANGS[lang];
  const key = page.id.startsWith("game-") ? "game" : page.id;
  const copy = page.product ? t.gamePages[page.product] : t[key];
  const meta = { path: page.path, title: copy.title, description: copy.description };
  if (page.id === "home") meta.jsonld = orgLd(lang);
  if (page.product) meta.jsonld = gameLd(lang, page.product, meta);
  const body = page.product ? PAGE.game(lang, page.product) : PAGE[page.id](lang);
  const altHref = url(lang === "en" ? "ar" : "en", page.path);
  const extra = page.id === "contact" ? `\n  <script src="/js/contact.js" defer></script>` : page.id === "home" ? `\n  <script src="/js/hero3d.js" defer></script>` : "";
  const html = `<!doctype html>
<html lang="${L.code}" dir="${L.dir}" data-alt="${altHref}">
<head>
  ${head(lang, meta)}
</head>

<body class="page-${page.id}">
  <a class="skip-link" href="#main">${esc(t.ui.skip)}</a>

  ${header(lang, page.nav, altHref)}

  <main id="main">
${body.trim()}
  </main>

  ${footer(lang)}

  ${SCRIPTS(extra)}
</body>
</html>
`;
  const out = join(ROOT, L.prefix.replace(/^\//, ""), page.path.replace(/^\//, ""), "index.html");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
}

/* 404 is shown for any bad address, so it carries both languages. */
function build404() {
  const e = en.notFound, a = ar.notFound;
  const block = (lang, n) => `<div class="nf-col" lang="${lang}" dir="${LANGS[lang].dir}"><p class="eyebrow">${esc(n.code)}</p><h1 class="section-title">${esc(n.h1)}</h1><p class="section-lead">${esc(n.lead)}</p><a class="btn btn-primary has-arrow" href="${url(lang, "/")}">${esc(COPY[lang].ui.backHome)}</a></div>`;
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(e.title)}</title>
  <meta name="robots" content="noindex">
  <meta name="theme-color" content="#07060B">
  <meta name="color-scheme" content="dark">
  <link rel="icon" href="/favicon.ico" sizes="48x48">
  <link rel="icon" href="/assets/images/favicon.png" type="image/png" sizes="192x192">
  <link rel="apple-touch-icon" href="/assets/images/apple-touch-icon.png">
  <link rel="stylesheet" href="/css/styles.css">
</head>
<body class="page-404">
  <header class="site-header"><div class="container header-inner"><a class="brand" href="/" aria-label="Atherbyte Studio"><img src="/assets/images/atherbyte-mark.webp" alt="" width="40" height="40"><span class="brand-name">Atherbyte <span>Studio</span></span></a></div></header>
  <main id="main" class="not-found"><div class="container nf-grid">${block("en", e)}${block("ar", a)}</div></main>
</body>
</html>
`;
  writeFileSync(join(ROOT, "404.html"), html);
}

/* The hand-written account pages stay the English source. Their header and footer are kept in step with the site,
   and an Arabic copy is written to ar/account/... by swapping each snippet listed in content/account.ar.mjs. */
const HEADER_RE = new RegExp('<header class="site-header">[\\s\\S]*?</header>');
const FOOTER_RE = new RegExp('<footer class="site-footer">[\\s\\S]*?</footer>');
function syncPage(rel) {
  const file = join(ROOT, rel);
  if (!existsSync(file)) return;
  const path = "/" + rel.replace("index.html", "");              // /account/ or /account/reset/
  const pairs = rel.includes("reset") ? ACCOUNT_RESET : ACCOUNT_INDEX;
  const isIndex = rel === "account/index.html";
  let html = readFileSync(file, "utf8").replace(/<html lang="en"[^>]*>/, `<html lang="en" data-alt="/ar${path}">`);
  html = html.replace(HEADER_RE, () => header("en", "", "/ar" + path, { account: isIndex }));
  html = html.replace(FOOTER_RE, () => footer("en"));
  writeFileSync(file, html);

  let a = html;
  for (const [from, to] of pairs) {
    if (!a.includes(from)) throw new Error(`${rel}: the English snippet for Arabic was not found: ${from.slice(0, 70)}`);
    a = a.split(from).join(to);
  }
  a = a.replace(/<html lang="en"[^>]*>/, `<html lang="ar" dir="rtl" data-alt="${path}">`);
  a = a.replace(`href="https://atherbyte.online${path}"`, `href="https://atherbyte.online/ar${path}"`);
  a = a.replace(HEADER_RE, () => header("ar", "", path, { account: isIndex }));
  a = a.replace(FOOTER_RE, () => footer("ar"));
  a = a.replace('<a class="skip-link" href="#main">Skip to main content</a>', `<a class="skip-link" href="#main">${esc(ar.ui.skip)}</a>`);
  const out = join(ROOT, "ar", rel);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, a);
}

function sitemap() {
  const entry = (path, withAlt) => {
    const alt = withAlt ? `\n    <xhtml:link rel="alternate" hreflang="en" href="${abs("en", path)}"/>\n    <xhtml:link rel="alternate" hreflang="ar" href="${abs("ar", path)}"/>\n    <xhtml:link rel="alternate" hreflang="x-default" href="${abs("en", path)}"/>` : "";
    return (withAlt ? ["en", "ar"] : ["en"]).map((l) => `  <url>\n    <loc>${abs(l, path)}</loc>${alt}\n  </url>`).join("\n");
  };
  const list = PAGES.map((p) => entry(p.path, true));
  // The games themselves live in their own repositories but are part of the site, so they stay listed.
  list.push(entry("/grid-snake/", false), entry("/Feel-the-time/", false));
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${list.join("\n")}
</urlset>
`;
}

for (const lang of Object.keys(LANGS)) for (const page of PAGES) buildPage(lang, page);
build404();
SYNCED_PAGES.forEach(syncPage);
writeFileSync(join(ROOT, "sitemap.xml"), sitemap());
console.log(`Built ${PAGES.length * 2} pages (${PAGES.length} x EN/AR), 404, synced ${SYNCED_PAGES.length} account pages, wrote sitemap.xml`);
