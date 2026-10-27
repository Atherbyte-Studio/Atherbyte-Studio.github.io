# Atherbyte Studio website

The official website of Atherbyte Studio: a static site (plain HTML, CSS and JavaScript) hosted for free on GitHub Pages. There is no build step and no server. What you see in this repository is exactly what gets published.

Live address: `https://atherbyte.online/`
(the custom domain is connected through the `CNAME` file; the old `atherbyte-studio.github.io` address redirects to it)

## What is where

```
.
├── index.html            The whole page: header, hero, games, about, services, contact, footer
├── 404.html              The "page not found" page
├── favicon.ico           Browser tab icon
├── robots.txt            Tells search engines they may crawl the site and where the sitemap is
├── sitemap.xml           List of the pages search engines should know about (add each new game's page here)
├── CNAME                 Connects the custom domain. Leave it alone
├── .nojekyll             Empty file. Tells GitHub to publish the files exactly as they are
├── games/                /games/ (all games) and one info page per game (games/grid-snake/, ...)
├── css/
│   └── styles.css        All the styling. Colours and sizes are at the top of the file
├── js/
│   ├── site-config.js    YOUR DETAILS: email, testimonials, client projects
│   ├── games-data.js     YOUR GAMES: the list the game cards are built from
│   └── main.js           Menu, game cards, fade-in effects (you rarely need to touch this)
└── assets/
    └── images/
        ├── atherbyte-logo-original.png   The logo exactly as supplied (not used by the page)
        ├── atherbyte-logo-lockup.webp    Web-sized copy of the full logo (hero)
        ├── atherbyte-mark.webp           The "A" mark (menu bar and footer)
        ├── og-image.png                  Picture shown when the link is shared
        ├── favicon.png, apple-touch-icon.png
        └── games/                        One picture per game
```

The two games themselves live in their own repositories (`grid-snake` and `Feel-the-time`). This repository only links to them. **Never create folders named `grid-snake` or `Feel-the-time` here**, because that could hide the games.

## Common jobs

You can do all of these on github.com: open the file, click the pencil icon (Edit), change the text, then click **Commit changes**. The live site updates about a minute later.

### Change the contact email
The address is currently `atherbyte.studio@gmail.com`. To change it, edit it in `js/site-config.js`:

```js
email: "you@yourdomain.com",
```

The "Email us" button, the "Copy email address" button and the "Ask about this" links on the service cards are built from that line. The same address is also written in `index.html` (the plain email link in the Contact section that works without JavaScript, the footer "Email" link, and the structured data near the top). Search `index.html` for `atherbyte.studio@` and change those too.

### Social links
Instagram and Facebook are written directly in `index.html`, in two places: the Contact section and the footer (search the file for `instagram`). To change a link, edit its `href` in both places. To add another profile, copy one `<li>...</li>` line in each place and change the address, the label and the icon. Only use real, official profiles. Keep `target="_blank" rel="noopener noreferrer"` so links open in a new tab safely.

### Add a third game
1. Add a screenshot of the game to `assets/images/games/` (16:10, 1280 x 800 WebP works well) and, for its page, a second one of the game being played.
2. In `js/games-data.js`, copy one whole `{ ... }` block, paste it after the last one (keep a comma between blocks) and change the text, the `image`, the `page` (for example `"/games/my-game/"`) and the `url` (use `https://atherbyte.online/<game-folder>/`).
3. Create the game's page: copy the folder `games/grid-snake/` to `games/my-game/` and edit `games/my-game/index.html`: the title, description, `canonical`, `og:url`, the headings and texts, the images and the two "Play Now" links. Every page must have its **own** `canonical` (its own address, never the home page's). Only describe what the game really does.
4. In `sitemap.xml`, add the game's studio page and the game itself (copy `<url>` blocks).
5. In `index.html`, copy one game card into the fallback list (see below) and update the "About the studio" text, which says how many games have been released.

There is a longer explanation at the top of `games-data.js`. The new card appears on the site with a **Play Now** and a **Details** button. A block that has no `title` or `description` is skipped, so it can never break the other games.

`index.html` also contains a ready-made copy of the game cards (inside `<div class="game-grid" id="game-grid">`). It is a safety net: it is what visitors see if JavaScript does not run, and the script replaces it with the cards from `games-data.js` when it does.

Each game's own page (in its own repository) should also carry its own `canonical`, Open Graph tags, icons and a link back to `https://atherbyte.online/`.

### Show real testimonials
Add real customer feedback to `testimonials: [ ... ]` in `js/site-config.js`. The Testimonials section is only added to the page once there is at least one.

### Show client projects
Add finished client work to `clientProjects: [ ... ]` in `js/site-config.js`. The Portfolio section and its menu link are only added to the page once there is at least one.

### Change colours
At the top of `css/styles.css`, the `:root { ... }` block holds the colours. Change a value there and it changes everywhere.

## Accounts (`/account/`)

One account for the whole studio: username and password, sign-in shared by the site and the games (they all live on
`atherbyte.online`, so they share the browser's `localStorage`). The page talks to the **Atherbyte API** (a Cloudflare
Worker, repository `atherbyte-api`). Nothing secret is in this repository.

| File | What it is |
| --- | --- |
| `account/index.html` | The page: sign in, create account, profile. It has its own strict Content-Security-Policy. |
| `js/atherbyte-account.js` | The shared client (sign in, sessions, refresh, sign out, `requireAccount()`). Games can load it too. |
| `js/account-page.js` | The behaviour of `/account/`. |
| `css/account.css` | Its styles (uses the same colours as `styles.css`). |
| `tests/atherbyte-account.test.js` | Unit tests: `node --test "tests/*.test.js"`. They are not part of any page. |

### Turning it on (nothing is active until you do this)
1. Deploy the Worker (see the `atherbyte-api` README) and copy its address.
2. In `js/site-config.js`, set `account.apiBaseUrl` to that address (https). While it is `""`, `/account/` says accounts are
   not available, the menu has no "Sign in" link, and **no game is affected**.
3. Create a free Cloudflare Turnstile widget. Put its **site key** in `account.turnstileSiteKey` (the secret key goes only
   into the Worker). If the Worker runs without the security check, leave it `""`.
4. If the API is not on `*.workers.dev` or `api.atherbyte.online`, add its address to `connect-src` in the
   `<meta http-equiv="Content-Security-Policy">` of `account/index.html`.
5. To ask visitors to sign in before a game, set `requiresAccount: true` for that game in `js/games-data.js`.
   Its card then reads "Sign in to play" and brings the visitor back to the game after signing in.

### What works and what does not yet
- **Works once the Worker is deployed:** create account, sign in, "who am I", automatic session refresh, sign out
  (which also revokes the session on the server), the recovery warning, the `Sign in` menu link, the `next=` return trip.
- **Shown but switched off** (`account.features` in `site-config.js`): adding a recovery email and profile pictures. The
  Worker has no endpoints for them yet, so the page shows the forms disabled with a plain explanation instead of
  pretending. Pictures are only ever offered after the email is verified.
- **"Sign in first" is a convenience, not a lock.** A game page is a public file; anyone can open it directly or run a copy.
  Real protection is on the server (requests without a valid token are refused) and, for the leaderboard, in the score
  checks that are still to be built. Score submission to the leaderboard is **not** enabled by any of this.
- The session (access and refresh token) is kept in `localStorage`, so a script injected into any page on the domain
  could read it. That is why the account page has a strict policy and the site loads no third-party scripts, apart from
  Cloudflare's security check on `/account/` only.

## Testing a change

After you commit, wait a minute, open the live site and refresh (Ctrl+F5 on Windows, Cmd+Shift+R on Mac). Check on a phone as well as a computer.

### If something goes wrong
GitHub remembers every version, so nothing is ever lost.

1. Open the file you changed on github.com and click **History** (top right of the file view).
2. Click the last version that worked.
3. Click the **...** menu on that file and choose **View file**, then click **Raw**.
4. Select all the text (Ctrl+A or Cmd+A) and copy it.
5. Go back to the file, click the pencil icon, select everything, paste, and **Commit changes**.

If a mistake in `js/site-config.js` or `js/games-data.js` breaks something (a missing comma or quotation mark is the usual cause), restore that file the same way.

## Web address (SEO)

The site's one official address is `https://atherbyte.online/`. These places in `index.html` must keep using it (never the old `atherbyte-studio.github.io` address): the `canonical` link, `og:url`, `og:image`, `twitter:image` and the structured data. Game links in `js/games-data.js` and `index.html` also use it. The `CNAME` file connects the domain; leave it alone.

Each game page is its own page (its own repository), so it should carry its own `canonical` pointing at its own address (for example `https://atherbyte.online/grid-snake/`), never the home page's address.

## Principles

- No fake claims: no invented statistics, clients, reviews or contact details.
- No tracking, no third-party scripts, no paid services.
- Fonts are the visitor's own system fonts, so nothing extra is downloaded.
