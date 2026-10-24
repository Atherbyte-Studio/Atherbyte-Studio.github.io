# Atherbyte Studio website

The official website of Atherbyte Studio: a static site (plain HTML, CSS and JavaScript) hosted for free on GitHub Pages. There is no build step and no server. What you see in this repository is exactly what gets published.

Live address: `https://atherbyte-studio.github.io/`
(a custom domain can be connected later; see "When you connect a custom domain" below)

## What is where

```
.
├── index.html            The whole page: header, hero, games, about, services, contact, footer
├── 404.html              The "page not found" page
├── favicon.ico           Browser tab icon
├── .nojekyll             Empty file. Tells GitHub to publish the files exactly as they are
├── css/
│   └── styles.css        All the styling. Colours and sizes are at the top of the file
├── js/
│   ├── site-config.js    YOUR DETAILS: email, social links, testimonials, client projects
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

### Add your contact email
Open `js/site-config.js` and put your address between the quotation marks:

```js
email: "you@yourdomain.com",
```

The "Email us" button, the "Copy email address" button and the "Ask about this" links on the service cards then appear on their own. While the email is empty, none of them are shown and the Contact section says details are coming soon.

### Add social links
In `js/site-config.js`, add one line per profile inside `social: [ ... ]`:

```js
{ label: "GitHub", url: "https://github.com/your-profile" },
```

They appear in the Contact section and the footer. Only add real, official profiles.

### Add a third game
1. Add the game's picture to `assets/images/games/` (a 16:10 shape such as 640 x 400 pixels works best; JPG, PNG, WebP and SVG are all fine).
2. In `js/games-data.js`, copy one whole `{ ... }` block, paste it after the last one (keep a comma between blocks) and change the text and the `url`.

There is a longer explanation at the top of that file. A new card appears on the site; nothing else needs to change.

The `<noscript>` message in `index.html` (inside the Games section) lists direct links to the games for visitors with JavaScript turned off. If you add a game, add it there too if you want it included.

### Show real testimonials
Add real customer feedback to `testimonials: [ ... ]` in `js/site-config.js`. The Testimonials section stays hidden until there is at least one.

### Show client projects
Add finished client work to `clientProjects: [ ... ]` in `js/site-config.js`. The Portfolio section and its menu link stay hidden until there is at least one.

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

If a mistake in `js/site-config.js` or `js/games-data.js` breaks the page (a missing comma or quotation mark is the usual cause), restore that file the same way.

## When you connect a custom domain

Do this only after the domain is purchased. The steps are in the Pages settings (Settings, then Pages, then Custom domain). Once the site works on the new address, update these places so link previews and search engines use it:

- `index.html`: the `canonical` link, `og:url`, `og:image` and `twitter:image` addresses (all currently start with `https://atherbyte-studio.github.io/`).
- GitHub will add a file called `CNAME` to this repository. Leave it alone.

## Principles

- No fake claims: no invented statistics, clients, reviews or contact details.
- No tracking, no third-party scripts, no paid services.
- Fonts are the visitor's own system fonts, so nothing extra is downloaded.
