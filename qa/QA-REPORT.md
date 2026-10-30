# QA report: website redesign branch

Branch: `claude/atherbyte-website-redesign-3bd78e`. Tested against a local copy of the branch (`python -m http.server`), Chrome 156 / Edge headless, Lighthouse 12. Nothing was merged or deployed.

## 1. Screenshots (`qa/screenshots/`)
| Page | File |
|---|---|
| Home, desktop 1280 | `home-desktop.png` |
| Home, mobile 375 | `home-mobile.jpg` |
| Products | `products-desktop.png` |
| Games | `games-desktop.png` |
| SaaS & Tools | `saas-desktop.png` |
| Services | `services-desktop.png` |
| Portfolio | `portfolio-desktop.png` |
| Account (desktop, mobile) | `account-desktop.png`, `account-mobile.jpg` |
| Contact | `contact-desktop.png` |

Desktop shots are Chrome headless at 1280 px. Mobile shots use the browser's 375 px emulation (headless Chrome cannot go narrower than about 500 px). The account page shows the empty gap where the Cloudflare Turnstile check loads; headless Chrome does not render it.

## 2. Lighthouse (mobile preset unless noted; local server)
Raw reports: `qa/lighthouse/*.json`, table: `qa/lighthouse/summary.json`.

| Page | Perf | A11y | Best Pract. | SEO | LCP | CLS |
|---|---|---|---|---|---|---|
| Home (mobile) | 99 | 100 | 79 | 100 | 2.0 s | 0 |
| Home (desktop) | 100 | 100 | 78 | 100 | 0.4 s | 0 |
| Products | 100 | 100 | 79 | 100 | 1.6 s | 0 |
| Games | 100 | 100 | 79 | 100 | 1.6 s | 0 |
| SaaS & Tools | 100 | 100 | 79 | 100 | 1.4 s | 0 |
| Services | 100 | 100 | 79 | 100 | 1.4 s | 0 |
| Portfolio | 100 | 100 | 79 | 100 | 1.6 s | 0 |
| About | 100 | 100 | 79 | 100 | 1.4 s | 0 |
| Contact | 100 | 100 | 100 | 100 | 1.4 s | 0 |
| Grid Snake info page | 100 | 100 | 100 | 100 | 1.7 s | 0 |
| Stop the Timer info page | 100 | 100 | 100 | 100 | 1.7 s | 0 |
| Account | 99 | 100 | 100 | 69 | 1.7 s | 0.015 |

Notes on the scores
- **Best Practices 78 to 79:** the only failing items are "third-party cookies" and an "issues" entry, both caused by Google AdSense (`googleads.g.doubleclick.net`). The AdSense script is already on `main`, so this is not from the redesign. Pages where AdSense did not set a cookie during the run score 100.
- **Account SEO 69:** `is-crawlable` fails because the page is intentionally `noindex` (unchanged from `main`).
- **Local server caveat:** `python http.server` sends no compression and no cache headers, so the "text compression", "cache lifetime" and "render-blocking" hints in the reports are artefacts of the test server. GitHub Pages compresses and caches. Real-world scores should be re-checked on the preview or live URL after approval (PageSpeed Insights).

## 3. Accessibility
- **Contrast:** Lighthouse contrast audit passes on all 12 pages (muted text on the dark background is about 8:1).
- **Keyboard:** Tab order on the home page is logical: skip link, logo, the 8 nav items, Account, hero buttons, then the content. All interactive elements show a 2 px lilac focus outline.
- **Mobile navigation (375 px):** the menu button is reachable by Tab, Enter opens it, Tab moves into the links, Escape closes it and returns focus to the button. `aria-expanded` and the label update correctly. No tap target in the header, footer or buttons is smaller than 44 px.
- **Semantics:** one `h1` per page, labelled sections, skip link, breadcrumbs, all images have alt text (`qa/seo-check.mjs`).
- Not done: a screen-reader pass (NVDA/VoiceOver). Lighthouse and keyboard checks only.

## 4. Account system
No account backend or authentication code was changed (`js/atherbyte-account.js`, `js/account-page.js`, `js/reset-page.js`, `account/*.html` bodies and the Content-Security-Policy are untouched; the header and footer of the account pages were swapped for the new shared ones).
- Existing access: `/account/` and `/account/reset/` load, Content-Security-Policy hash test passes, 30 of 30 account unit tests pass.
- **Login / logout were verified with a mocked API, not the real backend.** I did not sign in against the production API, because that needs real credentials and would create or use real accounts. The unmodified account scripts were run in a throwaway copy (outside the repo) with a fake `fetch`. Results: wrong password shows "Wrong username or password." and stores nothing; correct password shows the signed-in view and stores the session; the session survives a reload; navigating Games to Account works; Sign out calls the logout endpoint, clears storage, shows the signed-out view and the message "You are signed out."
- **Real backend login still needs one manual check by you** on the preview, with a real test account.
- Games do not currently require an account (`requiresAccount: false`), so the "Sign in to play" path is covered by unit tests only.

## 5. SEO (`node qa/seo-check.mjs`: 13 pages, 0 problems)
- Unique titles and descriptions on every indexable page; all titles 70 characters or fewer.
- Canonical equals the page's own production URL on every page; no `github.io` URL anywhere.
- `og:url`, `og:image` (1200x630 PNG), `twitter:image` and alt text present and consistent.
- Favicon (`.ico` and 192 px PNG) and apple-touch-icon present on every page.
- Sitemap: 12 URLs, all `https://atherbyte.online/`, covering every indexable page plus both game URLs. Account and 404 are intentionally excluded (noindex).
- `robots.txt` unchanged: allows all, points to the production sitemap.

## 6. Links
- `node tools/link-check.mjs`: 14 pages, 457 internal links and anchors, 0 broken.
- Game URLs `https://atherbyte.online/grid-snake/` and `https://atherbyte.online/Feel-the-time/` appear unchanged on every page that lists them (6 each); a read-only request to both live URLs returns 200. Account links point to `/account/` from the header and footer of every page.

## 7. Status labels
Checked in the built HTML of Home, Products, Games, SaaS & Tools and Portfolio: Atherbyte Mind Clash is always **In Development** and has no play button; Dental Clinic Website is always **In Progress**, labelled "Project preview", with no button; only Grid Snake and Stop the Timer have Play Now.

## 8. Issues found and fixed in this pass
1. **Account page layout shift (CLS 0.247):** the page starts with all views hidden, so the footer jumped when one appeared. Fixed in CSS by reserving the height (now 0.015).
2. **Header Account button stayed on "Sign in" right after signing in** (it only updated on page load). Fixed in `js/main.js` with the client's existing change hook; it also reverts on sign out.
3. **Largest image lazy-loaded on listing pages** (Lighthouse "LCP lazy loaded"). The first picture on each page now loads immediately.
4. **Home and Services titles too long for search results** (85 and 82 characters). Shortened.

## 9. Known limitations
- No contact form (needs a backend); contact is the existing email and social profiles.
- AdSense lowers Best Practices to 79; not changed because it is existing production behaviour.
- Lighthouse run on a local server; production-hosted numbers should be re-run after approval.
- Screen-reader testing and real-device testing (iOS Safari, Android Chrome) not done.

## 10. Production unchanged
`main` and `origin/main` are both at `3d0608f` (unchanged). The live site still serves the old home page (`<title>Atherbyte Studio | Free Browser Games & Web Experiences`). No DNS, Cloudflare, Supabase, `CNAME` or account backend files were touched.
