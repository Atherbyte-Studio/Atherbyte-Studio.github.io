/*
  tools/link-check.mjs: checks every internal link and image in the built pages.
    node tools/link-check.mjs
  Links to the games themselves (/grid-snake/, /Feel-the-time/) live in other repositories, so they are listed, not checked.
*/
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EXTERNAL_GAMES = ["/grid-snake/", "/Feel-the-time/"];
const pages = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    if (["node_modules", ".git", ".claude", "tests", "backend", "src"].includes(f)) continue;
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f.endsWith(".html")) pages.push(p);
  }
})(ROOT);

let bad = 0, count = 0;
const ids = (html) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const cache = new Map();
const load = (p) => cache.get(p) ?? (cache.set(p, readFileSync(p, "utf8")), cache.get(p));
function resolveLocal(path) {
  const clean = path.split("#")[0].split("?")[0];
  let f = join(ROOT, clean);
  if (clean.endsWith("/")) f = join(f, "index.html");
  return existsSync(f) && statSync(f).isFile() ? f : null;
}
for (const page of pages) {
  const html = load(page);
  const rel = page.slice(ROOT.length);
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const url = m[1];
    if (/^(https?:|mailto:|data:|tel:|javascript:)/.test(url)) {
      if (url.startsWith("https://atherbyte.online/")) {
        const path = url.slice("https://atherbyte.online".length);
        if (EXTERNAL_GAMES.some((g) => path.startsWith(g))) continue;
        count++;
        const f = resolveLocal(path);
        if (!f && !/\.(png|webp|ico)$/.test(path)) { bad++; console.log(`BROKEN  ${rel}: ${url}`); }
      }
      continue;
    }
    if (url.startsWith("#")) { count++; if (!ids(html).has(url.slice(1))) { bad++; console.log(`NO ANCHOR ${rel}: ${url}`); } continue; }
    const base = url.startsWith("/") ? url : "/" + join(dirname(rel), url).split("\\").join("/").replace(/^\//, "");
    count++;
    if (EXTERNAL_GAMES.some((g) => base.startsWith(g))) continue;
    const f = resolveLocal(base);
    if (!f) { bad++; console.log(`BROKEN  ${rel}: ${url}`); continue; }
    const hash = base.split("#")[1];
    if (hash && f.endsWith(".html") && !ids(load(f)).has(hash)) { bad++; console.log(`NO ANCHOR ${rel}: ${url}`); }
  }
}
console.log(`${pages.length} pages, ${count} internal links checked, ${bad} problem(s)`);
process.exit(bad ? 1 : 0);
