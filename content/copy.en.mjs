/* English copy. content/copy.ar.mjs must have exactly the same keys (tests/site.test.mjs checks it). */
export default {
  lang: { switchTo: "العربية", switchLabel: "Switch to Arabic (العربية)", switchShort: "AR" },
  ui: {
    skip: "Skip to main content", home: "Home", openMenu: "Open menu", closeMenu: "Close menu",
    menuLabel: "Main", footerProducts: "Footer: products", footerStudio: "Footer: studio", footerLegal: "Footer: legal",
    breadcrumb: "Breadcrumb", details: "Details", detailsAbout: "about", opensNewTab: "(opens in a new tab)",
    preview: "Preview", illustrative: "Illustrative preview · demo data", concept: "Concept preview",
    rights: "All rights reserved.", backHome: "Back to home",
    emailUs: "Email us", copyEmail: "Copy email address", copied: "Email address copied.", copyFail: "Couldn't copy automatically. Please select the address and copy it.",
    statusLabel: "Status", category: "Category", comingSoon: "Not playable yet.",
    tagline: "Games, SaaS and custom software. Built with care.",
    onlineHeading: "Online"
  },
  nav: { products: "Products", services: "Services", about: "About", contact: "Contact", privacy: "Privacy Policy", account: "Account", signIn: "Sign in" },
  footer: {
    blurb: "An independent digital products company. We build games, SaaS products and custom software.",
    products: "Products", studio: "Studio", legal: "Legal",
    allProducts: "All products", games: "Games", saas: "SaaS", portfolio: "Portfolio",
    services: "Services", about: "About", contact: "Contact", account: "Account", privacy: "Privacy Policy"
  },
  status: { live: "Live Product", available: "Available", dev: "In Development" },
  kind: { saas: "SaaS", game: "Browser Game", concept: "Logic Game" },
  product: {
    "atherbyte-queue": {
      title: "Atherbyte Queue", category: "SaaS · Dental clinics", cta: "Open Atherbyte Queue",
      summary: "Smart queue management for dental clinics. Manage patient turns at reception, let patients join remotely, and follow queue progress in real time.",
      tags: ["Dental clinics", "Remote join", "Queue progress"],
      alt: "Illustrative preview of a dental clinic queue board with demo data: ticket A12 in service and tickets A13 to A16 waiting. It is not a screenshot of the live system."
    },
    "grid-snake": {
      title: "Grid Snake", category: "Browser game · Arcade", cta: "Play Grid Snake",
      summary: "A browser snake game. Steer, eat to grow, and avoid the walls and your own tail, across four game modes.",
      tags: ["Classic", "Time Attack", "Survival", "Apple Run"],
      alt: "Grid Snake's start screen showing four game modes: Classic, Time Attack, Survival and Apple Run.",
      alt2: "A green snake on a dark grid heading towards a golden apple, with the score, best score, level and speed shown beside the board."
    },
    "stop-the-timer": {
      title: "Stop the Timer", category: "Browser game · Precision", cta: "Play Stop the Timer",
      summary: "A timing game. Start the timer, then stop it as close to the target time as you can. Pick a 1, 3 or 5 second target and build your streak.",
      tags: ["1, 3 or 5 second targets", "Best score", "Streaks"],
      alt: "Stop the Timer's start screen: a cartoon rabbit beside buttons for 1, 3 and 5 second targets and a Start button.",
      alt2: "Stop the Timer mid-round: the clock is hidden and a Stop button waits under the target time."
    },
    "mind-clash": {
      title: "Atherbyte Mind Clash", category: "Logic game", cta: "",
      summary: "A head-to-head game of logic and pattern-spotting. Players race to submit the right answer, and the winner stays on to face the next challenger. Not playable yet.",
      tags: ["Pattern discovery", "Logic traps", "Secret code"],
      alt: "Concept preview of Atherbyte Mind Clash: a four-digit secret code with four clues, and two players competing.",
      planned: [
        "Pattern discovery challenges", "Logical trap challenges", "A four-digit secret-code puzzle with four clues",
        "First player to submit the correct answer wins", "Local leaderboard and scoring", "Winner stays and challenges the next player"
      ]
    }
  },

  /* ---------- Home ---------- */
  home: {
    title: "Atherbyte Studio | Digital Products, Games & Custom Software",
    description: "Atherbyte Studio builds digital products: the Atherbyte Queue SaaS, browser games like Grid Snake and Stop the Timer, and custom web, mobile and software projects.",
    hero: {
      eyebrow: "Digital products studio",
      title: "We Build Digital Experiences That Move Ideas Forward.",
      lead: "Atherbyte Studio designs and builds software products, browser games and custom digital solutions. Start with what we've shipped.",
      cta1: "Explore products", cta2: "Start a project",
      note: "One live SaaS product, two playable games, one in development.",
      scroll: "Scroll to products", canvasLabel: "Decorative animated geometric artwork"
    },
    featured: {
      eyebrow: "Featured products", title: "Made here. Running now.",
      lead: "Every product shows its real status. Open one to use it, or see what's still being built."
    },
    philosophy: {
      eyebrow: "Product philosophy", title: "Fewer things, finished properly.",
      lead: "We are a product studio first. That changes how we build for clients too.",
      items: [
        { h: "We own what we ship", p: "Our products run on our own accounts, our own servers and our own responsibility. We know what it takes to keep software working." },
        { h: "Honest about status", p: "Live, available or in development: every product says which one it is. Nothing is presented as more finished than it is." },
        { h: "Fast, light, accessible", p: "Pages that load quickly, work on phones and keyboards, and respect people who ask for reduced motion." },
        { h: "Small teams, direct talk", p: "You deal with the people who build the work. We would rather say \"not a fit\" than promise everything." }
      ]
    },
    services: {
      eyebrow: "Services", title: "Built for you, with the same care.",
      lead: "The team that builds our products can build yours.", all: "All services", more: "Discuss a project"
    },
    process: {
      eyebrow: "How we work", title: "A clear path from idea to launch.",
      lead: "Four steps, and you know where you are in each of them.",
      steps: [
        { h: "Discover", p: "We listen, ask what the project must achieve and who it is for, and agree what is in and out of scope." },
        { h: "Design", p: "Structure, flows and visuals. You see the direction before the heavy building starts." },
        { h: "Build", p: "Iterative development with working versions you can open and comment on along the way." },
        { h: "Launch & improve", p: "We release it, check it works in the real world, and keep improving what matters." }
      ]
    },
    craft: {
      eyebrow: "Technology & craft", title: "Chosen for the job, not for fashion.",
      lead: "This is what our own products and this website are actually built with.",
      items: [
        { h: "Web platform", p: "This website is hand-built HTML, CSS and JavaScript, served from GitHub Pages. No framework, no tracking scripts of our own." },
        { h: "Cloudflare Workers", p: "Our account API and contact handling run on Cloudflare Workers, with bot checks (Turnstile) and rate limits in front of them." },
        { h: "Supabase", p: "Accounts and data for our own products are stored in Supabase (Postgres, Auth and Storage), reached only through our API." },
        { h: "Next.js & TypeScript", p: "Atherbyte Queue is a Next.js and TypeScript application deployed on Cloudflare." }
      ],
      principles: ["Accessible by default", "Keyboard and touch first", "Bilingual EN / AR with real RTL", "Performance budgets"]
    },
    about: {
      eyebrow: "About Atherbyte", title: "An independent studio building for the web.",
      p1: "Atherbyte Studio is an independent digital products company. We make browser games and software products ourselves, and we use that experience to build websites and software for other people.",
      p2: "We have released two games, Grid Snake and Stop the Timer, and our first SaaS product, Atherbyte Queue. Atherbyte Mind Clash is in development.",
      link: "More about the studio"
    },
    cta: {
      title: "Have a product or project in mind?",
      lead: "Tell us what you want to build. We reply by email and say honestly whether we are a good fit.",
      b1: "Start a project", b2: "See services"
    }
  },

  /* ---------- Products / Games / SaaS / Portfolio ---------- */
  products: {
    title: "Products | Atherbyte Studio",
    description: "All Atherbyte products: Atherbyte Queue (SaaS), Grid Snake and Stop the Timer (browser games) and Atherbyte Mind Clash (in development).",
    eyebrow: "Products", h1: "Everything we've built.",
    lead: "A live SaaS product, two playable browser games and a logic game in development. Each card shows its real status.",
    saas: "Software", games: "Games", gamesLead: "Open one and play. Nothing to install."
  },
  games: {
    title: "Browser Games | Atherbyte Studio",
    description: "Play Atherbyte's free browser games: Grid Snake and Stop the Timer. Atherbyte Mind Clash is in development.",
    eyebrow: "Games", h1: "Browser games, ready to play.",
    lead: "Open a page and play. No downloads. Progress is kept on your device.",
    soon: "In development", soonLead: "Not playable yet. We show it so you can see what's coming."
  },
  saas: {
    title: "SaaS Products | Atherbyte Studio",
    description: "Atherbyte's software products. Atherbyte Queue, queue management for dental clinics, is live.",
    eyebrow: "SaaS", h1: "Software products.",
    lead: "Atherbyte Queue, our queue management system for dental clinics, is live. It is a separate application with its own sign-in.",
    howTitle: "One product, one app.",
    how: [
      { h: "Its own application", p: "Each product runs separately from this website and from the other products." },
      { h: "Its own accounts", p: "Accounts are independent per product. An Atherbyte Studio account does not give access to Atherbyte Queue." },
      { h: "Its own terms and privacy", p: "Plans, billing and data handling belong to the individual product and are explained by that product." }
    ],
    note: "Nothing can be bought or subscribed to on this website.", ctaTitle: "Need custom software instead?", ctaLead: "If you want something built for your business, that is what our services are for.", ctaBtn: "See services"
  },
  portfolio: {
    title: "Portfolio | Atherbyte Studio",
    description: "Atherbyte Studio's portfolio: released products and products in development, each with its real status.",
    eyebrow: "Portfolio", h1: "What we've built, and what we're building.",
    lead: "Released and unfinished work are kept apart, and every item carries its real status.",
    released: "Released", building: "Being built",
    clients: "Client projects", clientsLead: "We have not published any completed client projects yet. When we do, they will appear here with the client's permission.",
    ctaTitle: "Your project could be next.", ctaBtn: "Start a project"
  },

  /* ---------- Services ---------- */
  services: {
    title: "Services: SaaS, Web, Mobile & Custom Software | Atherbyte Studio",
    description: "Atherbyte Studio builds SaaS products, websites and web apps, mobile apps and custom software. Tell us about your project.",
    eyebrow: "Services", h1: "SaaS, web, mobile and custom software.",
    lead: "We build our own products and we build for other businesses. Here is what we can make with you, and what each one means.",
    items: [
      { id: "saas", icon: "layers", h: "SaaS Development", p: "Subscription-style web products: accounts, dashboards, data models and the back end behind them.",
        scope: ["Product scoping and a first usable version", "Authentication and account flows", "Admin and customer dashboards", "Deployment on modern cloud infrastructure"], value: "Best when you have a product idea or an internal tool that should grow into a product." },
      { id: "web", icon: "window", h: "Web Development", p: "Fast, responsive, accessible websites and web applications.",
        scope: ["Business and product websites", "Interactive web applications", "Multilingual and right-to-left layouts", "Performance and accessibility work"], value: "Best when you need a site or web app that loads quickly and works on every screen." },
      { id: "mobile", icon: "phone", h: "Mobile Development", p: "Mobile-friendly apps and experiences for phones and tablets.",
        scope: ["Mobile-first interfaces", "Installable web apps and app-store packaging where it makes sense", "Touch-friendly interactions", "Connecting to your existing back end"], value: "Best when your users are mostly on phones. We will tell you honestly if a responsive web app is enough." },
      { id: "custom", icon: "cube", h: "Custom Software", p: "Software shaped around the way your business works.",
        scope: ["Internal tools and workflow software", "Integrations between systems", "Replacing spreadsheets and manual steps", "Maintenance and improvement of what we build"], value: "Best when an off-the-shelf tool is not the right fit." }
    ],
    scopeLabel: "Typical scope", valueLabel: "Why it matters",
    howTitle: "Simple and direct.",
    howLead: "We are a small independent studio, and we would rather tell you honestly whether a project is a good fit than promise everything.",
    ctaTitle: "Tell us about your project.", ctaBtn: "Start a project"
  },

  /* ---------- About ---------- */
  about: {
    title: "About | Atherbyte Studio",
    description: "Atherbyte Studio is an independent digital products company building SaaS products, browser games and custom software.",
    eyebrow: "About", h1: "An independent digital products company.",
    lead: "Atherbyte Studio builds software products, browser games and custom digital solutions.",
    whatTitle: "We build and own our products.",
    p1: "We create browser games and software products ourselves, and we use that experience to build websites and software for other people.",
    p2: "So far we have released two games, Grid Snake and Stop the Timer, and our first software product, Atherbyte Queue, a queue management system for dental clinics. Atherbyte Mind Clash is in development.",
    focus: [
      { h: "Games", p: "Browser games that are ready to play the moment the page loads." },
      { h: "SaaS products", p: "Software products, each its own independent application." },
      { h: "Development services", p: "Websites, web and mobile apps, and custom software for businesses." }
    ],
    valuesTitle: "Principles we work by.",
    values: [
      { h: "Honest about status", p: "If something is unfinished, we say so. Every product shows its real state." },
      { h: "Quality over volume", p: "A small number of products, built with care, rather than a long list of half-finished ones." },
      { h: "Fast and accessible", p: "Lightweight pages that load quickly and work on phones, tablets and desktops." }
    ],
    ctaTitle: "Say hello.", ctaLead: "Questions about our products, or a project to discuss? We would like to hear from you.", ctaBtn: "Contact us"
  },

  /* ---------- Contact ---------- */
  contact: {
    title: "Contact | Atherbyte Studio",
    description: "Start a project with Atherbyte Studio or ask about our products. Use the project form or email us directly.",
    eyebrow: "Contact", h1: "Let's talk about your project.",
    lead: "Use the form for project inquiries, or write to us directly. We reply by email.",
    formTitle: "Project inquiry", direct: "Prefer email?", directLead: "Write to us directly and tell us what you need.",
    find: "Find us online",
    f: {
      name: "Name", email: "Email", type: "Project type", desc: "Project description", descHint: "What do you want to build, and who is it for? A few lines is enough.",
      budget: "Budget (optional)", link: "Reference link (optional)", linkHint: "A site or product you like, or an existing one.", method: "Preferred contact method (optional)",
      send: "Send inquiry", sending: "Sending…", required: "required",
      consent: "By sending this form you agree that we process your details to reply to you, as described in the",
      privacy: "Privacy Policy"
    },
    types: { "": "Choose a type", saas: "SaaS product", web: "Website or web app", mobile: "Mobile app", custom: "Custom software", other: "Something else" },
    methods: { "": "No preference", email: "Email", phone: "Phone call", chat: "Messaging app" },
    budgets: { "": "Not sure yet", small: "Under $2,000", mid: "$2,000 – $10,000", large: "Over $10,000" },
    msg: {
      ok: "Thank you. Your inquiry was received. We reply by email.",
      invalid: "Please check the highlighted fields.",
      name: "Enter your name.", email: "Enter a valid email address.", type: "Choose a project type.", desc: "Describe your project in at least 20 characters.", link: "Enter a full link starting with https://",
      captcha: "Please complete the security check, then send again.",
      limit: "Too many attempts. Please wait a minute and try again.",
      fail: "We couldn't send your inquiry. Nothing was saved. Please email us directly instead.",
      unavailable: "The form isn't available right now. Nothing was saved. Please email us directly instead.",
      network: "We couldn't reach the server. Nothing was saved. Check your connection or email us directly."
    }
  },

  /* ---------- Privacy ---------- */
  privacy: {
    title: "Privacy Policy | Atherbyte Studio",
    description: "How Atherbyte Studio handles personal information on its website, accounts and contact form, based on how the service is actually built.",
    eyebrow: "Legal", h1: "Privacy Policy",
    lead: "This policy explains what information Atherbyte Studio handles through this website, the Atherbyte account service and the project form, and why. It describes how the service is built today.",
    effective: "Effective date", updated: "This policy was last updated on",
    toc: "On this page",
    scope: "Scope",
    sections: [
      { id: "who", h: "1. Who we are",
        body: [
          { p: "Atherbyte Studio is an independent digital products studio. This policy covers atherbyte.online (this website), the Atherbyte account service used at /account/, and the project inquiry form." },
          { p: "It does not cover separate products with their own sign-in and privacy practices. In particular, Atherbyte Queue (queue.atherbyte.online) is a separate application and handles its own data. Read the privacy information inside that product." },
          { p: "Privacy contact: atherbyte.studio@gmail.com." }
        ] },
      { id: "collect", h: "2. Information we handle",
        body: [
          { h3: "Visitors" },
          { p: "You can browse this website without an account. The pages are served by GitHub Pages, which, like any web host, receives technical information such as your IP address and browser details when your browser requests a page. We do not run our own analytics on these pages." },
          { p: "Most pages load Google's AdSense script. This website does not place any ad units of its own. Google may use cookies or similar technologies and process data to provide and measure ads, under Google's own policies. The account pages (/account/) do not load it." },
          { h3: "Accounts" },
          { ul: [
            "Username and password. Passwords are passed to our authentication provider (Supabase Auth) and we do not keep a copy ourselves.",
            "A placeholder internal address that is created for every account. It cannot receive mail and is never shown to anyone.",
            "Optional recovery email. If you add one, it is stored in the authentication provider and used only to send the verification link and password-reset links.",
            "Optional profile picture, available after your email is verified (PNG, JPEG or WebP, up to 200 KB). Pictures are stored in a public storage bucket, which means anyone who has the picture's address can view it. You can remove it from your account page.",
            "Technical data used to protect sign-in: Cloudflare Turnstile checks your browser when you register, sign in or request a reset, and your IP address is used for rate limits and sent to Turnstile for that check.",
            "If you link a Grid Snake player to your account: the link between the player and your account, the player's name and best score (which can appear on the Grid Snake leaderboard), and the saved progress, including up to 20 earlier saved copies. Each link attempt is also recorded in a log (account, player, outcome and time; no recovery codes or names)."
          ] },
          { h3: "Project form" },
          { p: "If you use the project inquiry form we receive what you type: your name, email, project type and description, and, if you choose to give them, a budget range, a reference link and a preferred contact method. The same security check and rate limits apply. You can also email us directly instead." }
        ] },
      { id: "why", h: "3. Why we use it, and on what basis",
        body: [
          { ul: [
            "To create and run your account, keep you signed in and let you recover access (providing the service you asked for).",
            "To answer your project inquiry or email (taking steps at your request, and our legitimate interest in running a studio).",
            "To keep the service safe: bot checks, rate limits and abuse prevention (our legitimate interest).",
            "To show and measure ads through Google AdSense, where it is active (Google's processing under its own terms)."
          ] },
          { p: "Where data-protection law such as the GDPR applies to you, these are the legal bases we rely on." }
        ] },
      { id: "storage", h: "4. Where it is stored, and who else is involved",
        body: [
          { p: "We use service providers who process information on our behalf or to deliver the service:" },
          { ul: [
            "GitHub Pages: hosts the website.",
            "Cloudflare: runs our API (Cloudflare Workers), the Turnstile check and rate limiting.",
            "Supabase: stores account records, recovery email status, profile pictures, Grid Snake account links and saves, and project inquiries.",
            "An email delivery provider configured in Supabase sends verification and reset emails. Google (Gmail) receives emails you send to us.",
            "Google AdSense: advertising script on public pages, as described above."
          ] },
          { p: "These providers may process data in countries other than yours. We share information with a provider only as needed for the purposes above, or if the law requires it." }
        ] },
      { id: "cookies", h: "5. Cookies, sessions and local storage",
        body: [
          { p: "Our own pages do not set cookies. When you sign in, your session (an access token and a refresh token) is kept in your browser's local storage, shared across atherbyte.online so the account and the games recognise you. Signing out revokes the session on the server and removes it from your browser. If you choose a language, that choice is also kept in local storage on your device." },
          { p: "Google AdSense, and Cloudflare Turnstile on the account page, may use cookies or similar technologies of their own." },
          { p: "Our Grid Snake and Stop the Timer games keep progress on your device. A game's own page explains what it stores." }
        ] },
      { id: "retention", h: "6. How long we keep it",
        body: [
          { p: "Account information is kept until you ask us to delete your account. Access tokens are short-lived, and your session is revoked when you sign out. You can remove your profile picture yourself. Project inquiries sent through the form are kept for 12 months and then deleted by us. Earlier saved copies of Grid Snake progress are capped at 20 per player. Account records are not deleted automatically." },
          { p: "There is no delete button on the account page. To have your account deleted, email atherbyte.studio@gmail.com from the address you used and tell us your username; the same applies to any other information you want deleted. We carry out deletion by hand, and removing Grid Snake player records is a separate manual step. We delete information we are able to delete, and we cannot guarantee that copies held by providers, backups or content you published elsewhere disappear immediately." }
        ] },
      { id: "security", h: "7. How we protect it",
        body: [
          { p: "Measures that exist in the service today:" },
          { ul: [
            "Pages and the API are served over HTTPS.",
            "The API accepts browser requests only from an allow-list of origins and validates input on the server.",
            "Sign-in, registration, password reset and the project form use a bot check, and the API applies rate limits.",
            "Session tokens are sent in a request header, not in cookies, and the account page has a strict content-security policy.",
            "Passwords are handled by the authentication provider. Resetting a password signs out the account's sessions.",
            "Secret keys stay on the server and are not published in this website's code. The API does not log request bodies.",
            "Profile pictures can be changed only through our server, which checks type, size and that your email is verified."
          ] },
          { p: "No system is completely secure, and we cannot promise absolute protection. Choose a strong, unique password and add a recovery email." }
        ] },
      { id: "rights", h: "8. Your choices and rights",
        body: [
          { p: "Depending on where you live, you may have the right to ask to access, correct, delete or export your personal information, to object to or restrict some processing, and to complain to your local data-protection authority." },
          { p: "To make a request, email atherbyte.studio@gmail.com from the address you used, and tell us your username for account requests. We may need to confirm that the request is yours before acting on it." }
        ] },
      { id: "changes", h: "9. Changes to this policy",
        body: [
          { p: "If we change how we handle information, we will update this page and its date. Significant changes will be shown on this page." }
        ] }
    ]
  },

  /* ---------- Game info pages ---------- */
  gamePages: {
    "grid-snake": {
      title: "How to Play Grid Snake: Modes, Controls and Tips | Atherbyte Studio",
      description: "Learn how to play Grid Snake, a free browser snake game with four modes: Classic, Time Attack, Survival and Apple Run. Controls, rules and what's inside.",
      lead: "A browser snake game. Steer, eat to grow, and avoid the walls and your own tail. Choose from four modes and play with solid walls or wrap-around edges.",
      steps: [
        { h: "Pick a mode.", p: "Choose one of the four modes on the home screen, then press Play." },
        { h: "Steer the snake.", p: "Use the arrow keys or W, A, S, D. On a phone or tablet, swipe anywhere on the screen." },
        { h: "Eat and grow.", p: "Every piece of food adds to your score and your length. Keep clear of your own tail, and of the walls unless wrap-around edges are on." },
        { h: "Pause any time.", p: "Press Space to pause and resume." }
      ],
      stepsCaption: "The game board with score, level and speed.",
      insideTitle: "Four ways to play", insideLead: "Switch modes from the home screen. Best scores are kept separately for each mode.",
      inside: [
        { h: "Classic", p: "The original rules. Every point makes you a little faster." },
        { h: "Time Attack", p: "Score as much as you can in 60 seconds. Power-ups appear." },
        { h: "Survival", p: "No clock. Every 20 seconds you level up: faster, with a new obstacle. Power-ups appear." },
        { h: "Apple Run", p: "You are the apple. A not-very-bright snake is hunting you. Dash, drop banana peels and decoys, and stay un-eaten." }
      ],
      know: [
        "Choose solid walls or wrap-around edges in Settings. Best scores are kept for each edge setting too.",
        "Every point you score earns a coin when a run ends, and finishing achievements pays more. Spend coins on looks in the Shop. Looks never change the rules.",
        "No account is needed. Your progress is saved on your device, and a backup code lets you move it to another one.",
        "Sound, volume, vibration and animations can be adjusted in Settings."
      ],
      other: "About Stop the Timer"
    },
    "stop-the-timer": {
      title: "How to Play Stop the Timer: Rules and Scoring | Atherbyte Studio",
      description: "Learn how to play Stop the Timer, a free browser timing game. Pick a 1, 3 or 5 second target, stop the clock as close as you can, and build your streak.",
      lead: "A timing game. Start the timer, then stop it as close to the target time as you can. Pick a 1, 3 or 5 second target and build your streak.",
      steps: [
        { h: "Choose a target.", p: "Pick 1, 3 or 5 seconds, or press 1, 2 or 3 on the keyboard." },
        { h: "Press Start.", p: "Click Start or press Space. The clock is hidden, so you have to feel the time." },
        { h: "Press Stop.", p: "Press Stop or Space when you think the target time has been reached." },
        { h: "Read your result.", p: "The game shows how far off you were in milliseconds, with a grade and your points." }
      ],
      stepsCaption: "During a round there is no clock. Feel the time, then press Stop.",
      insideTitle: "Grades and points", insideLead: "The closer you stop to the target, the better the grade.",
      inside: [
        { h: "Perfect", p: "You hit the target exactly. The biggest score and the biggest celebration." },
        { h: "Amazing, Great and Good", p: "Stopping within 15, 40 or 90 milliseconds of the target. These count as wins and keep your streak going." },
        { h: "Close and Miss", p: "Further away, with fewer or no points. A miss resets your streak." }
      ],
      know: [
        "Winning rounds in a row builds a streak that adds bonus points. The 3 and 5 second targets multiply your points.",
        "Your best result is kept for each target, and your rounds, perfects and best streak are shown below the game.",
        "No account is needed. Your progress is saved on your device. The Sound and Reset buttons sit under the game."
      ],
      other: "About Grid Snake"
    },
    shared: {
      eyebrow: "Browser game", howEyebrow: "How to play", howTitle: "Learn it in a minute.",
      insideEyebrow: "What's inside", knowEyebrow: "Good to know", knowTitle: "A few details.",
      ctaEyebrow: "Ready?", ctaLead: "It runs right in your browser. Nothing to download or install.",
      play: "Play now", allGames: "All games", bug: "Found a bug or have an idea? Write to"
    }
  },

  notFound: { title: "Page not found | Atherbyte Studio", h1: "This page doesn't exist.", lead: "The link may be old or mistyped. Head back to the home page to find our products.", code: "Error 404" }
};
