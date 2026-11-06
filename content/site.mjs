/*
  content/site.mjs: everything the website says about itself, as data.

  To add a product: add one object to `products` below, then run `node tools/build.mjs`.
  Every page that lists products (home, Products, Games, SaaS & Tools, Portfolio) and the sitemap pick it up.
  Nothing here is rendered in the browser: the build writes plain HTML files that are committed.
*/

export const SITE = {
  name: "Atherbyte Studio",
  origin: "https://atherbyte.online",
  email: "atherbyte.studio@gmail.com",
  tagline: "Digital Products. Built to Matter.",
  positioning:
    "We build digital products, games, and software experiences — and create custom solutions for businesses.",
  social: [
    { id: "instagram", label: "Instagram", href: "https://www.instagram.com/atherbyte.studio/" },
    { id: "facebook", label: "Facebook", href: "https://www.facebook.com/profile.php?id=61595599060742" }
  ],
  ogImage: "/assets/images/og-image.png"
};

/* The only statuses a product can have. `tone` picks the badge colour in css/styles.css. */
export const STATUSES = {
  "available":      { label: "Available",      tone: "ok" },
  "live":           { label: "Live",           tone: "ok" },
  "in-development": { label: "In Development", tone: "accent" },
  "in-progress":    { label: "In Progress",    tone: "warm" },
  "coming-soon":    { label: "Coming Soon",    tone: "muted" }
};

/* Main navigation. `key` is matched against each page's `nav` value to mark the current page. */
export const NAV = [
  { key: "home", label: "Home", href: "/" },
  { key: "products", label: "Products", href: "/products/" },
  { key: "games", label: "Games", href: "/games/" },
  { key: "saas", label: "SaaS & Tools", href: "/saas/" },
  { key: "services", label: "Services", href: "/services/" },
  { key: "portfolio", label: "Portfolio", href: "/portfolio/" },
  { key: "about", label: "About", href: "/about/" },
  { key: "contact", label: "Contact", href: "/contact/" }
];

/*
  Products.
    kind        "game" or "saas" (SaaS & software products and projects). Decides which pages list it.
    status      one of the STATUSES keys above.
    group       Portfolio grouping: "product" (released), "development" (announced / building) or "project" (project or demo).
    url         The live product address. Leave it out for anything that is not available: no button is drawn then.
    page        The product's page on this site (optional).
    visual      { type: "image", src, alt } or { type: "mindclash" | "queue" } (designed previews, drawn in CSS).
    external    true = a separate app: its button opens in a new tab (target=_blank, rel="noopener noreferrer"). Used with status "live".
    requiresAccount  true = signed-out visitors see "Sign in to play" (kept from the earlier games list; works once accounts are set up).
*/
export const PRODUCTS = [
  {
    id: "grid-snake",
    kind: "game",
    group: "product",
    title: "Grid Snake",
    category: "Arcade",
    status: "available",
    summary: "A browser-based snake game with multiple game modes and progression features.",
    detail:
      "Steer, eat to grow, and avoid the walls and your own tail. Play with solid walls or wrap-around edges, across four game modes.",
    tags: ["Classic", "Time Attack", "Survival", "Apple Run"],
    url: "https://atherbyte.online/grid-snake/",
    page: "/games/grid-snake/",
    cta: "Play Now",
    requiresAccount: false,
    visual: {
      type: "image",
      src: "/assets/images/games/grid-snake.webp",
      alt: "Grid Snake's start screen showing four game modes: Classic, Time Attack, Survival and Apple Run."
    }
  },
  {
    id: "stop-the-timer",
    kind: "game",
    group: "product",
    title: "Stop the Timer",
    category: "Precision",
    status: "available",
    summary:
      "A timing and reaction challenge where players attempt to stop the timer at precise target intervals.",
    detail: "Pick a 1, 3 or 5 second target, stop the timer as close to it as you can, and build your streak.",
    tags: ["1, 3 or 5 second targets", "Best score", "Streaks"],
    url: "https://atherbyte.online/Feel-the-time/",
    page: "/games/stop-the-timer/",
    cta: "Play Now",
    requiresAccount: false,
    visual: {
      type: "image",
      src: "/assets/images/games/stop-the-timer.webp",
      alt: "Stop the Timer's start screen: a cartoon rabbit beside buttons for 1, 3 and 5 second targets and a Start button."
    }
  },
  {
    id: "mind-clash",
    kind: "game",
    group: "development",
    title: "Atherbyte Mind Clash",
    category: "Competitive brain game",
    status: "in-development",
    summary: "A future competitive brain-game experience. Not playable yet.",
    detail:
      "A head-to-head game of logic and pattern-spotting. Players race to be the first to submit the right answer, and the winner stays on to face the next challenger.",
    planned: [
      "Pattern discovery challenges",
      "Logical trap challenges",
      "A four-digit secret-code puzzle with four clues",
      "First player to submit the correct answer wins",
      "Local leaderboard and scoring",
      "Winner stays and challenges the next player"
    ],
    tags: ["Pattern discovery", "Logic traps", "Secret code"],
    visual: { type: "mindclash" }
  },
  {
    id: "atherbyte-queue",
    kind: "saas",
    group: "product",
    title: "Atherbyte Queue",
    category: "SaaS / Dental Clinics",
    subtitle: "Dental Clinic Queue Management",
    status: "live",
    summary:
      "Smart queue management for dental clinics. Manage patient turns at reception, let patients join remotely, and follow queue progress in real time.",
    detail:
      "Atherbyte Queue is a separate application for dental clinics, with its own sign-in. It opens on its own address, queue.atherbyte.online.",
    tags: ["Dental clinics", "Remote join", "Queue progress"],
    url: "https://queue.atherbyte.online",
    external: true,
    cta: "Visit Product",
    visual: { type: "queue" }
  }
];

export const CATEGORIES = [
  {
    id: "games",
    kind: "game",
    title: "Games",
    href: "/games/",
    blurb: "Browser games we design, build and run ourselves. Open a page and play.",
    cta: "Browse games"
  },
  {
    id: "saas",
    kind: "saas",
    title: "SaaS & Software Products",
    href: "/saas/",
    blurb: "Software products and tools, starting with Atherbyte Queue.",
    cta: "See software projects"
  }
];

export const SERVICES = [
  {
    id: "website",
    title: "Website Development",
    icon: "window",
    text: "Fast, responsive websites for businesses and brands: clear structure, clean design, built to work on every screen."
  },
  {
    id: "webapp",
    title: "Web Application Development",
    icon: "layers",
    text: "Interactive web applications: dashboards, internal tools and customer-facing products that run in the browser."
  },
  {
    id: "custom",
    title: "Custom Software",
    icon: "cube",
    text: "Software shaped around the way your business works, when an off-the-shelf tool is not the right fit."
  },
  {
    id: "business",
    title: "Business Digital Solutions",
    icon: "flow",
    text: "Practical digital tools that replace spreadsheets and manual steps: booking, catalogues, simple workflows."
  },
  {
    id: "uiux",
    title: "UI/UX Implementation",
    icon: "pen",
    text: "Turning designs into polished, accessible interfaces, or improving the screens you already have."
  }
];

/* Pages that exist as hand-written files and only have their header and footer kept in sync by the build. */
export const SYNCED_PAGES = [
  "games/grid-snake/index.html",
  "games/stop-the-timer/index.html",
  "account/index.html",
  "account/reset/index.html",
  "404.html"
];
