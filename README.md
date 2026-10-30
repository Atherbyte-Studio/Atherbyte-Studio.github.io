# Atherbyte Studio website

The official website of Atherbyte Studio: a static site (plain HTML, CSS and JavaScript) hosted for free on GitHub Pages. There is no server and no deployment build: what you see in this repository is exactly what gets published. Pages are generated from `content/` and `src/` by a small helper script (see below), and the generated files are committed.

Live address: `https://atherbyte.online/`
(the custom domain is connected through the `CNAME` file; the old `atherbyte-studio.github.io` address redirects to it)

## What is where

```
.
├── content/site.mjs      ALL SITE CONTENT AS DATA: products, statuses, navigation, services, email, social links
├── src/pages/*.html      The text of each page (home, products, games, saas, services, portfolio, about, contact)
├── tools/build.mjs       Writes the finished pages from the two items above (Node 18+, no dependencies)
├── tools/link-check.mjs  Checks every internal link and anchor in the built pages
├── tools/og-source.html  Source of the sharing image (assets/images/og-image.png)
├── index.html, products/, games/, saas/, services/, portfolio/, about/, contact/
│                         Built pages. Do not edit by hand: change src/ or content/ and run the build
├── games/<name>/         Hand-written game info pages (header and footer are kept in sync by the build)
├── account/              Account pages (header and footer kept in sync by the build)
├── 404.html, favicon.ico, robots.txt, sitemap.xml (written by the build), CNAME, .nojekyll
├── css/styles.css        All styling. Design tokens (colours, type, spacing, radius, shadows) are at the top
├── css/account.css       Account pages only
├── js/main.js            Menu, copy-email button, scroll fade-in, "Sign in to play"
├── js/site-config.js     Contact email and account service settings
└── assets/images/        Logo, icons, sharing image, game pictures
```

The two games themselves live in their own repositories (`grid-snake` and `Feel-the-time`). This repository only links to them. **Never create folders named `grid-snake` or `Feel-the-time` here**, because that could hide the games.

GitHub Pages publishes the committed files exactly as they are. The build script is only a helper for editing: run it after any change in `content/` or `src/`, then commit the result.

```bash
node tools/build.mjs
node tools/link-check.mjs
```

## Common jobs

### Add a product (a game, a SaaS product or a project)
1. Open `content/site.mjs` and copy one block in `PRODUCTS`. Set `kind` (`game` or `saas`), `group` (`product`, `development` or `project`, which decides the Portfolio section) and `status` (`available`, `in-development`, `in-progress` or `coming-soon`).
2. Only add a `url` when the product is really live. Without a `url` the card shows a status note instead of a button, so nothing unfinished can look playable.
3. For a picture, use `visual: { type: "image", src, alt }` (a 16:10 WebP in `assets/images/games/`), or one of the designed previews (`mindclash`, `dental`; new ones go in `visual()` in `tools/build.mjs`).
4. Run `node tools/build.mjs`. Home, Products, Games, SaaS & Tools, Portfolio and the sitemap all update.
5. For a game that gets its own info page, copy `games/grid-snake/` and edit it (its own `canonical`, texts and images), then add `games/<name>/index.html` to `SYNCED_PAGES` in `content/site.mjs`.

### Change a status
Change `status` on the product in `content/site.mjs` and rebuild. Status names and colours live in `STATUSES`.

### Change the contact email or social links
Edit `SITE` in `content/site.mjs` (email and social links) and `email` in `js/site-config.js`, then rebuild. Use only real, official profiles.

### Edit page text
Edit the file in `src/pages/` (for example `src/pages/about.html`) and rebuild.


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
5. To ask visitors to sign in before a game, set `requiresAccount: true` for that game in `content/site.mjs`.
   Its card then reads "Sign in to play" and brings the visitor back to the game after signing in.

### Profile picture (same picture on the website and in every game)
One picture per account, set on `/account/` and only by an account with a verified recovery email (the Worker checks this on
every upload; the page only hides the form). It is stored by the API (see `atherbyte-api`, "Profile pictures") and comes
back from `GET /v1/me` as `avatar_url`. The page resizes it to 256 x 256 before sending.

Showing it, anywhere on `atherbyte.online` (a game, a leaderboard header, another page):

```html
<script src="/js/site-config.js"></script>
<script src="/js/atherbyte-account.js"></script>
<script>
  var account = AtherbyteAccount.get();
  account.refreshAvatar().then(function (url) {      // url is "" when nobody is signed in or there is no picture
    if (url) { document.getElementById("my-avatar").src = url; }
  });
</script>
```

`account.avatarUrl()` returns the same address instantly from this browser (no request), so it is safe to call often.
`refreshAvatar()` asks the server at most once an hour. The website's own header already uses it. Only addresses inside the
project's public `avatars` bucket are ever returned. Other players' pictures (for a leaderboard) will come from the game's
own API answers, which should include the `avatar_url` of each player.

The feature is **off** until the Worker and database side are deployed (`account.features.avatarUpload` in `js/site-config.js`).

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

If a mistake in `js/site-config.js` or `content/site.mjs` breaks something (a missing comma or quotation mark is the usual cause), restore that file the same way.

## Web address (SEO)

The site's one official address is `https://atherbyte.online/`. These places in every page (set once in `tools/build.mjs`) must keep using it (never the old `atherbyte-studio.github.io` address): the `canonical` link, `og:url`, `og:image`, `twitter:image` and the structured data. Game links in `content/site.mjs` also use it. The `CNAME` file connects the domain; leave it alone.

Each game page is its own page (its own repository), so it should carry its own `canonical` pointing at its own address (for example `https://atherbyte.online/grid-snake/`), never the home page's address.

## Principles

- No fake claims: no invented statistics, clients, reviews or contact details.
- No tracking, no third-party scripts, no paid services.
- Fonts are the visitor's own system fonts, so nothing extra is downloaded.
