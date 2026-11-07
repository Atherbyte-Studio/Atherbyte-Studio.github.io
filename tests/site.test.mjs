// Run: node --test tests/   (no network, no dependencies)
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import en from "../content/copy.en.mjs";
import ar from "../content/copy.ar.mjs";
import { PAGES, PRODUCTS, LANGS } from "../content/site.mjs";

const shape = (v) => Array.isArray(v) ? v.map(shape) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, shape(v[k])])) : typeof v;
const file = (lang, path) => (LANGS[lang].prefix + path + "index.html").replace(/^\//, "");

test("Arabic copy has exactly the English copy's keys and list lengths", () => {
  assert.deepEqual(shape(ar), shape(en));
});

test("every page exists in both languages with lang/dir, canonical, hreflang and a privacy link", () => {
  for (const l of Object.keys(LANGS)) for (const p of PAGES) {
    const f = file(l, p.path);
    assert.ok(existsSync(f), f);
    const h = readFileSync(f, "utf8");
    assert.match(h, new RegExp(`<html lang="${l}" dir="${LANGS[l].dir}"`), f);
    assert.ok(h.includes(`<link rel="canonical" href="https://atherbyte.online${LANGS[l].prefix}${p.path}">`), f + " canonical");
    for (const hl of ["en", "ar", "x-default"]) assert.ok(h.includes(`hreflang="${hl}"`), f + " " + hl);
    assert.ok(h.includes(`href="${LANGS[l].prefix}/privacy/"`), f + " privacy link");
  }
});

test("internal page links resolve", () => {
  const known = new Set(["/", "/account/", "/ar/account/", "/grid-snake/", "/Feel-the-time/"]);
  for (const l of Object.keys(LANGS)) for (const p of PAGES) known.add(LANGS[l].prefix + p.path);
  for (const l of Object.keys(LANGS)) for (const p of PAGES) {
    const h = readFileSync(file(l, p.path), "utf8");
    for (const m of h.matchAll(/href="(\/[^"#?]*)/g)) {
      if (/\.(css|js|webp|png|ico|svg|xml)$/.test(m[1])) continue;
      assert.ok(known.has(m[1]), `${p.path} (${l}) -> ${m[1]}`);
    }
  }
});

test("product destinations are preserved", () => {
  const urls = Object.fromEntries(PRODUCTS.map((p) => [p.id, p.url]));
  assert.equal(urls["atherbyte-queue"], "https://queue.atherbyte.online");
  assert.equal(urls["grid-snake"], "https://atherbyte.online/grid-snake/");
  assert.equal(urls["stop-the-timer"], "https://atherbyte.online/Feel-the-time/");
  assert.equal(urls["mind-clash"], undefined);
  const home = readFileSync("index.html", "utf8");
  for (const u of Object.values(urls).filter(Boolean)) assert.ok(home.includes(`href="${u}"`), u);
});

test("sitemap lists every page in both languages, plus the games, and not the account", () => {
  const s = readFileSync("sitemap.xml", "utf8");
  for (const p of PAGES) for (const pre of ["", "/ar"]) assert.ok(s.includes(`<loc>https://atherbyte.online${pre}${p.path}</loc>`), pre + p.path);
  assert.ok(s.includes("/grid-snake/</loc>") && s.includes("/Feel-the-time/</loc>"));
  assert.ok(!s.includes("/account/"));
});

test("hero headline is exact in both languages", () => {
  assert.equal(en.home.hero.title, "We Build Digital Experiences That Move Ideas Forward.");
  assert.equal(ar.home.hero.title, "نبني تجارب رقمية تدفع الأفكار إلى الأمام.");
});

test("privacy page has every section, the public contact address, and no absolute guarantees", () => {
  for (const f of ["privacy/index.html", "ar/privacy/index.html"]) {
    const h = readFileSync(f, "utf8");
    for (const id of ["who", "collect", "why", "storage", "cookies", "retention", "security", "rights", "changes"]) assert.ok(h.includes(`id="${id}"`), `${f} ${id}`);
    assert.ok(h.includes("mailto:atherbyte.studio@gmail.com"), f);
  }
  for (const f of ["privacy/index.html", "ar/privacy/index.html"]) assert.doesNotMatch(readFileSync(f, "utf8"), /id="open"|open-box|still finalising|undecided|to be confirmed/i, f);
  assert.doesNotMatch(JSON.stringify(en.privacy), /100%|never shared|certified|ISO 27001|SOC 2|military/i);
});

test("account page links to the privacy policy", () => {
  assert.ok(readFileSync("account/index.html", "utf8").includes('href="/privacy/"'));
});

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

test("every shared account message has an Arabic translation", () => {
  const { MESSAGES } = require("../js/atherbyte-account.js");
  const { DICT } = require("../js/account-i18n.js");
  for (const [code, text] of Object.entries(MESSAGES)) assert.ok(DICT[text], `no Arabic for ${code}: ${text}`);
});

test("every English string literal in the account scripts' say()/busy calls has an Arabic translation", () => {
  const { DICT, PATTERNS } = require("../js/account-i18n.js");
  const covered = (s) => DICT[s] || PATTERNS.some(([re]) => re.test(s));
  for (const f of ["js/account-page.js", "js/reset-page.js"]) {
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(/(?:say\("(?:info|warn|success)",|setBusy\(button, true,|avatarMessage\("(?:ok|error)",|formError\((?:form|forgotPanel)?,?\s*)\s*"([^"]{6,})"/g)) {
      const lit = m[1];
      // literals followed by a "+" build a longer sentence; those are covered by PATTERNS using the full text
      if (/^(Signed in\. Welcome back, |Account created\. You are signed in as |We sent a confirmation link|Still waiting for the confirmation)/.test(lit)) continue;
      assert.ok(covered(lit), `${f}: no Arabic for "${lit}"`);
    }
  }
});

test("Arabic account pages exist, are RTL, noindex, point at /ar/ routes and load the Arabic strings", () => {
  for (const f of ["ar/account/index.html", "ar/account/reset/index.html"]) {
    const h = readFileSync(f, "utf8");
    assert.match(h, /<html lang="ar" dir="rtl"/);
    assert.ok(h.includes("noindex") && h.includes("/js/account-i18n.js") && h.includes('href="/ar/privacy/"'), f);
  }
  assert.ok(readFileSync("account/index.html", "utf8").includes('data-alt="/ar/account/"'));
});

import { createHash } from "node:crypto";

test("every page references its CSS and JS with a ?v= content hash that matches the file", () => {
  const pages = [...PAGES.flatMap((p) => ["", "ar/"].map((pre) => (pre + p.path + "index.html").replace(/^\//, ""))), "404.html", "account/index.html", "account/reset/index.html", "ar/account/index.html", "ar/account/reset/index.html"];
  const ref = /(?:href|src)="\/((?:css|js)\/[^"?]+)\?v=([0-9a-f]{10})"/g;
  let seen = 0;
  for (const f of pages) {
    const h = readFileSync(f, "utf8");
    for (const m of h.matchAll(ref)) { seen++; assert.equal(m[2], createHash("sha256").update(readFileSync(m[1])).digest("hex").slice(0, 10), `${f} ${m[1]}`); }
    assert.doesNotMatch(h, /(?:href|src)="\/(?:css|js)\/[^"?]+\.(?:css|js)"/, `${f} has an unversioned asset`);
    assert.match(h, /\/css\/styles\.css\?v=/, f);
    if (!f.includes("404")) assert.match(h, /\/js\/main\.js\?v=/, f);
  }
  assert.ok(seen > 100);
  assert.match(readFileSync("index.html", "utf8"), /\/js\/hero3d\.js\?v=/);
});

test("the header links to the privacy policy in both languages, and the footer keeps its link", () => {
  for (const [f, pre, label] of [["index.html", "", en.nav.privacy], ["ar/index.html", "/ar", ar.nav.privacy]]) {
    const h = readFileSync(f, "utf8");
    const nav = h.slice(h.indexOf('class="nav-list"'), h.indexOf("</ul>", h.indexOf('class="nav-list"')));
    assert.ok(nav.includes(`<a href="${pre}/privacy/">${label}</a>`), f);
    assert.ok(h.slice(h.indexOf("<footer")).includes(`href="${pre}/privacy/"`), f + " footer");
  }
  assert.equal(en.nav.privacy, "Privacy Policy");
  assert.match(readFileSync("privacy/index.html", "utf8"), /aria-current="page">Privacy Policy/);
});
