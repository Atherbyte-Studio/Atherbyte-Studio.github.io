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
1. Add the game's picture to `assets/images/games/` (a 16:10 shape such as 640 x 400 pixels works best; JPG, PNG, WebP and SVG are all fine).
2. In `js/games-data.js`, copy one whole `{ ... }` block, paste it after the last one (keep a comma between blocks) and change the text and the `url` (use `https://atherbyte.online/<game-folder>/`).
3. In `sitemap.xml`, add the game's page (copy one `<url>` block).
4. In `index.html`, the "About the studio" text says how many games have been released; update it when you add one.

There is a longer explanation at the top of `games-data.js`. The new card appears on the site. A block that has no `title` or `description` is skipped, so it can never break the other games.

`index.html` also contains a ready-made copy of the game cards (inside `<div class="game-grid" id="game-grid">`). It is a safety net: it is what visitors see if JavaScript does not run, and the script replaces it with the cards from `games-data.js` when it does. For a complete safety net, copy one `<article class="game-card">...</article>` block there too and change its text and links.

### Show real testimonials
Add real customer feedback to `testimonials: [ ... ]` in `js/site-config.js`. The Testimonials section is only added to the page once there is at least one.

### Show client projects
Add finished client work to `clientProjects: [ ... ]` in `js/site-config.js`. The Portfolio section and its menu link are only added to the page once there is at least one.

### Change colours
At the top of `css/styles.css`, the `:root { ... }` block holds the colours. Change a value there and it changes everywhere.

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
