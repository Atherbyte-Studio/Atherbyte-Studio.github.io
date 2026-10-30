/* qa/seo-check.mjs: checks titles, descriptions, canonicals, Open Graph, icons, sitemap and robots.  node qa/seo-check.mjs */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pages = [];
(function walk(d) { for (const f of readdirSync(d)) { if (["node_modules",".git",".claude","tests","backend","src","qa","tools","content"].includes(f)) continue; const p = join(d, f); statSync(p).isDirectory() ? walk(p) : f.endsWith(".html") && pages.push(p); } })(ROOT);
const attr = (h, re) => (h.match(re) || [])[1];
const titles = new Map(), descs = new Map(); let problems = 0;
const bad = (m) => { problems++; console.log("  PROBLEM:", m); };
const rows = [];
for (const p of pages) {
  const h = readFileSync(p, "utf8"); const rel = p.slice(ROOT.length + 1).split("\\").join("/");
  const urlPath = "/" + rel.replace(/index\.html$/, "").replace(/404\.html$/, "404.html");
  const title = attr(h, /<title>([^<]*)<\/title>/), desc = attr(h, /<meta name="description" content="([^"]*)"/);
  const canon = attr(h, /<link rel="canonical" href="([^"]*)"/), ogUrl = attr(h, /property="og:url" content="([^"]*)"/);
  const ogImg = attr(h, /property="og:image" content="([^"]*)"/), twImg = attr(h, /name="twitter:image" content="([^"]*)"/);
  const noindex = /name="robots" content="[^"]*noindex/.test(h);
  const h1 = (h.match(/<h1[\s>]/g) || []).length;
  console.log(rel, noindex ? "(noindex)" : "");
  if (!title) bad("no title"); else (titles.get(title) || titles.set(title, []).get(title)).push(rel);
  if (!desc && !noindex) bad("no meta description"); else (descs.get(desc) || descs.set(desc, []).get(desc)).push(rel);
  if (title && title.length > 70) bad(`title long (${title.length})`);
  if (desc && desc.length > 170) bad(`description long (${desc.length})`);
  if (!canon) { if (!noindex) bad("no canonical"); } else {
    if (!canon.startsWith("https://atherbyte.online/")) bad("canonical not production domain: " + canon);
    if (!noindex && rel !== "404.html" && canon !== "https://atherbyte.online" + urlPath) bad(`canonical ${canon} != page ${urlPath}`);
  }
  if (!noindex) {
    if (ogUrl !== canon) bad(`og:url ${ogUrl} != canonical ${canon}`);
    if (!ogImg || !ogImg.startsWith("https://atherbyte.online/")) bad("og:image missing/not production: " + ogImg);
    else { const local = join(ROOT, ogImg.replace("https://atherbyte.online/", "")); if (!existsSync(local) && !ogImg.includes("/grid-snake/") && !ogImg.includes("/Feel-the-time/")) bad("og:image file missing " + ogImg); }
    if (twImg !== ogImg) bad("twitter:image differs from og:image");
  }
  if (h1 !== 1 && rel !== "404.html") bad(`h1 count ${h1}`);
  if (/atherbyte-studio\.github\.io/.test(h)) bad("contains github.io domain");
  for (const m of h.matchAll(/<img\b[^>]*>/g)) if (!/\balt=/.test(m[0])) bad("img without alt: " + m[0].slice(0, 80));
  if (!/rel="icon"/.test(h) || !/apple-touch-icon/.test(h)) bad("icons missing");
}
for (const [t, l] of titles) if (l.length > 1) bad(`duplicate title "${t}": ${l.join(", ")}`);
for (const [d, l] of descs) if (l.length > 1) bad(`duplicate description: ${l.join(", ")}`);
const sm = readFileSync(join(ROOT, "sitemap.xml"), "utf8"); const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
console.log("\nsitemap:", locs.length, "urls");
for (const l of locs) if (!l.startsWith("https://atherbyte.online/")) bad("sitemap url off-domain " + l);
for (const p of pages) { const rel = p.slice(ROOT.length + 1).split("\\").join("/"); const h = readFileSync(p, "utf8"); if (/noindex/.test(h) || rel === "404.html") continue; const u = "https://atherbyte.online/" + rel.replace(/index\.html$/, ""); if (!locs.includes(u)) bad("not in sitemap: " + u); }
console.log("robots.txt:", readFileSync(join(ROOT, "robots.txt"), "utf8").replace(/\n/g, " | "));
for (const f of ["favicon.ico", "assets/images/favicon.png", "assets/images/apple-touch-icon.png", "assets/images/og-image.png"]) if (!existsSync(join(ROOT, f))) bad("missing " + f);
console.log(`\n${pages.length} pages checked, ${problems} problem(s)`);
process.exit(problems ? 1 : 0);
