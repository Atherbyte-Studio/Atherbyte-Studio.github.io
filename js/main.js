/*
  main.js: the small amount of behaviour the Atherbyte Studio site needs. No libraries.

  Pages (header, footer, product cards) are written by tools/build.mjs, so none of that depends on
  JavaScript. This file only adds extras on top:
    1. initLang        remembers the chosen language and sends returning visitors to it
    2. initAccountLink shows the signed-in username (and picture) in the header's Account button
    3. initMenu        the mobile menu button
    4. initYear        keeps the footer year current
    5. initReveal      gentle fade-in as sections scroll into view
    6. initTilt        pointer-driven depth on product previews (mouse and pen only)
    7. initGlow        soft light following the pointer on cards
*/
(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function $(s, r) { return (r || doc).querySelector(s); }
  function $all(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  function make(tag, cls) { var n = doc.createElement(tag); if (cls) { n.className = cls; } return n; }
  function store(key, value) {
    try { if (value === undefined) { return window.localStorage.getItem(key); } window.localStorage.setItem(key, value); } catch (e) { /* storage blocked: the page still works */ }
    return null;
  }

  function accountClient() {
    try { return window.AtherbyteAccount && window.AtherbyteAccount.get ? window.AtherbyteAccount.get() : null; }
    catch (e) { return null; }
  }

  /* ---------- 1. Language ---------- */
  // Choosing a language is remembered on this device. A returning visitor who chose Arabic is taken to the
  // Arabic version of an English page that has one (data-alt). Nothing is stored until a choice is made.
  function initLang() {
    $all("[data-lang]").forEach(function (link) {
      link.addEventListener("click", function () { store("atherbyte-lang", link.getAttribute("data-lang")); });
    });
    var isArabic = root.lang === "ar";
    var alt = root.getAttribute("data-alt");
    if (!isArabic && alt && store("atherbyte-lang") === "ar") {
      window.location.replace(alt + window.location.search + window.location.hash);
    }
  }

  /* ---------- 2. Account button ---------- */
  function initAccountLink() {
    var account = accountClient();
    var link = $("[data-account-link]");
    if (!account || !link || !account.isConfigured()) { return; }
    var label = $("span", link);
    var icon = $("svg", link);
    var fallback = link.getAttribute("data-signin") || "Sign in";
    var photo = null;
    function update() {
      var signedIn = account.hasSession();
      label.textContent = signedIn ? account.username() : fallback;
      var url = account.avatarUrl ? account.avatarUrl() : "";
      if (url && !photo) {
        photo = make("img", "nav-avatar");
        photo.alt = ""; photo.width = 24; photo.height = 24;
        photo.addEventListener("error", function () { photo.hidden = true; if (icon) { icon.style.display = ""; } });
        link.insertBefore(photo, label);
      }
      if (photo) {
        photo.hidden = !url;
        if (url && photo.getAttribute("src") !== url) { photo.src = url; }
        if (icon) { icon.style.display = url ? "none" : ""; }
      }
    }
    update();
    if (account.onChange) { account.onChange(update); }
    if (account.hasSession() && account.refreshAvatar) { account.refreshAvatar(false).then(update); }
  }

  /* ---------- 3. Mobile menu ---------- */
  function initMenu() {
    var toggle = $(".nav-toggle");
    var nav = $("#site-nav");
    if (!toggle || !nav) { return; }
    var wide = window.matchMedia("(min-width: 900px)");
    function isOpen() { return toggle.getAttribute("aria-expanded") === "true"; }
    function setOpen(open) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", toggle.getAttribute(open ? "data-close" : "data-open") || "Menu");
      nav.classList.toggle("is-open", open);
    }
    toggle.addEventListener("click", function () { setOpen(!isOpen()); });
    nav.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("a")) { setOpen(false); } });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape" && isOpen()) { setOpen(false); toggle.focus(); } });
    function onWide(e) { if (e.matches) { setOpen(false); } }
    if (wide.addEventListener) { wide.addEventListener("change", onWide); } else if (wide.addListener) { wide.addListener(onWide); }
  }

  /* ---------- 4. Year ---------- */
  function initYear() {
    var y = String(new Date().getFullYear());
    $all("[data-year]").forEach(function (n) { n.textContent = y; });
  }

  /* ---------- 5. Reveal on scroll ---------- */
  function initReveal() {
    var items = $all(".reveal");
    if (!items.length || reduce || !("IntersectionObserver" in window)) { return; }
    root.classList.add("reveal-ready");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    items.forEach(function (el, i) {
      el.style.setProperty("--reveal-delay", ((i % 4) * 70) + "ms");
      io.observe(el);
    });
    // If anything is still hidden after a moment (for example a print or snapshot), show it.
    window.setTimeout(function () { items.forEach(function (el) { el.classList.add("is-visible"); }); }, 6000);
  }

  /* ---------- 6. Tilt ---------- */
  // Only a real mouse or pen moves the preview. Touch keeps the resting pose; keyboard focus uses the CSS
  // :focus-within pose. Nothing important depends on this.
  function initTilt() {
    if (reduce || !finePointer) { return; }
    $all("[data-tilt]").forEach(function (stage) {
      var frame = 0;
      var x = 0, y = 0;
      function paint() {
        frame = 0;
        var r = stage.getBoundingClientRect();
        var px = (x - r.left) / r.width, py = (y - r.top) / r.height;
        px = Math.max(0, Math.min(1, px)); py = Math.max(0, Math.min(1, py));
        stage.style.setProperty("--ry", ((px - 0.5) * 14).toFixed(2) + "deg");
        stage.style.setProperty("--rx", ((0.5 - py) * 10).toFixed(2) + "deg");
        stage.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
        stage.style.setProperty("--my", (py * 100).toFixed(1) + "%");
      }
      // The card's stretched title link covers the stage, so listen on the whole card.
      var host = stage.closest(".pcard") || stage;
      host.addEventListener("pointermove", function (e) {
        if (e.pointerType === "touch") { return; }
        x = e.clientX; y = e.clientY;
        stage.classList.add("is-tilting");
        if (!frame) { frame = window.requestAnimationFrame(paint); }
      });
      host.addEventListener("pointerleave", function () {
        stage.classList.remove("is-tilting");
        ["--rx", "--ry"].forEach(function (p) { stage.style.removeProperty(p); });
      });
    });
  }

  /* ---------- 6b. Card light and lean ---------- */
  // The whole card leans a few degrees toward the pointer and its rim lights up where the pointer is.
  function initCards() {
    if (reduce || !finePointer) { return; }
    $all(".pcard").forEach(function (card) {
      var frame = 0, ex = 0, ey = 0;
      function paint() {
        frame = 0;
        var r = card.getBoundingClientRect();
        var px = (ex - r.left) / r.width, py = (ey - r.top) / r.height;
        card.style.setProperty("--cx", (px * 100).toFixed(1) + "%");
        card.style.setProperty("--cy", (py * 100).toFixed(1) + "%");
        card.style.setProperty("--cry", ((px - 0.5) * 5).toFixed(2) + "deg");
        card.style.setProperty("--crx", ((0.5 - py) * 4).toFixed(2) + "deg");
      }
      card.addEventListener("pointermove", function (e) {
        if (e.pointerType === "touch") { return; }
        ex = e.clientX; ey = e.clientY;
        if (!frame) { frame = window.requestAnimationFrame(paint); }
      });
      card.addEventListener("pointerleave", function () {
        ["--crx", "--cry"].forEach(function (p) { card.style.removeProperty(p); });
      });
    });
  }

  /* ---------- 6c. Header depth once the page scrolls ---------- */
  function initHeader() {
    var header = document.querySelector(".site-header");
    if (!header) { return; }
    function on() { header.classList.toggle("is-scrolled", (window.pageYOffset || root.scrollTop) > 8); }
    window.addEventListener("scroll", on, { passive: true });
    on();
  }

  /* ---------- 7. Glow ---------- */
  function initGlow() {
    if (reduce || !finePointer) { return; }
    $all("[data-glow]").forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", (e.clientX - r.left) + "px");
        card.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
  }

  [initLang, initAccountLink, initMenu, initYear, initReveal, initTilt, initCards, initHeader, initGlow].forEach(function (fn) {
    try { fn(); } catch (e) { /* one failing extra must never break the page */ }
  });
})();
