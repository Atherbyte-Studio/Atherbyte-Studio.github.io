/*
  content/site.mjs: language-independent facts about the site (addresses, statuses, product list).
  All words visitors read live in content/copy.mjs (English and Arabic side by side).
  Run `node tools/build.mjs` after changing either file; the generated pages are committed.
*/

export const SITE = {
  name: "Atherbyte Studio",
  origin: "https://atherbyte.online",
  // The public contact address already published on the live site (page footer, structured data).
  email: "atherbyte.studio@gmail.com",
  social: [
    { id: "instagram", label: "Instagram", href: "https://www.instagram.com/atherbyte.studio/" },
    { id: "facebook", label: "Facebook", href: "https://www.facebook.com/profile.php?id=61595599060742" }
  ],
  ogImage: "/assets/images/og-image.png",
  // Effective date of the privacy policy (update it whenever the policy text changes).
  privacyDate: "2026-11-07"
};

export const LANGS = {
  en: { code: "en", dir: "ltr", prefix: "", locale: "en_US", label: "EN", name: "English" },
  ar: { code: "ar", dir: "rtl", prefix: "/ar", locale: "ar_AR", label: "AR", name: "العربية" }
};

/* kind: saas | game | concept (decides the card's visual treatment). status keys map to labels in copy.mjs. */
export const PRODUCTS = [
  {
    id: "atherbyte-queue",
    kind: "saas",
    status: "live",
    tone: "ok",
    url: "https://queue.atherbyte.online",
    external: true,
    image: { src: "/assets/images/products/atherbyte-queue.webp", w: 1600, h: 1000, illustrative: true }
  },
  {
    id: "grid-snake",
    kind: "game",
    status: "available",
    tone: "ok",
    url: "https://atherbyte.online/grid-snake/",
    page: "/games/grid-snake/",
    image: { src: "/assets/images/games/grid-snake.webp", w: 640, h: 400 },
    image2: { src: "/assets/images/games/grid-snake-play.webp", w: 640, h: 400 }
  },
  {
    id: "stop-the-timer",
    kind: "game",
    status: "available",
    tone: "ok",
    url: "https://atherbyte.online/Feel-the-time/",
    page: "/games/stop-the-timer/",
    image: { src: "/assets/images/games/stop-the-timer.webp", w: 640, h: 400 },
    image2: { src: "/assets/images/games/stop-the-timer-play.webp", w: 640, h: 400 }
  },
  {
    id: "mind-clash",
    kind: "concept",
    status: "dev",
    tone: "accent"
  }
];

/* Pages generated in every language. `nav` marks the current item in the header. */
export const PAGES = [
  { id: "home", path: "/", nav: "home" },
  { id: "products", path: "/products/", nav: "products" },
  { id: "games", path: "/games/", nav: "products" },
  { id: "saas", path: "/saas/", nav: "products" },
  { id: "services", path: "/services/", nav: "services" },
  { id: "portfolio", path: "/portfolio/", nav: "products" },
  { id: "about", path: "/about/", nav: "about" },
  { id: "contact", path: "/contact/", nav: "contact" },
  { id: "privacy", path: "/privacy/", nav: "privacy" },
  { id: "game-grid-snake", path: "/games/grid-snake/", nav: "products", product: "grid-snake" },
  { id: "game-stop-the-timer", path: "/games/stop-the-timer/", nav: "products", product: "stop-the-timer" }
];

/* Hand-written pages (account area): English only. The build keeps their header and footer in sync. */
export const SYNCED_PAGES = ["account/index.html", "account/reset/index.html"];
