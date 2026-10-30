/*
  main.js: the small amount of behaviour the Atherbyte Studio site needs.
  No libraries. Each job is its own function; the list at the bottom runs them.

  The pages themselves (header, footer, product cards) are written by tools/build.mjs, so none of
  that depends on JavaScript. This file only adds extras on top:

    1. initGames        "Sign in to play" for games that ask for an account (only once accounts are set up)
    2. initAccountLink  Shows the signed-in username in the header's Account button
    3. initCopyEmail    Adds a "Copy email address" button on the Contact page
    4. initMenu         The mobile menu button
    5. initYear         Keeps the footer year current
    6. initReveal       Gentle fade-in as sections scroll into view
*/
(function () {
  "use strict";

  var CONFIG = window.ATHERBYTE_CONFIG || {};

  /* ---------- tiny helpers ---------- */
  function $(selector, root) { return (root || document).querySelector(selector); }
  function $all(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }

  // Creates an element. Text is always inserted as plain text (never as HTML), which is the safe way.
  function make(tag, className, text) {
    var node = document.createElement(tag);
    if (className) { node.className = className; }
    if (text !== undefined && text !== null) { node.textContent = text; }
    return node;
  }

  /* ---------- account (js/atherbyte-account.js; every use below copes with it being absent) ---------- */
  function accountClient() {
    try { return window.AtherbyteAccount && window.AtherbyteAccount.get ? window.AtherbyteAccount.get() : null; }
    catch (e) { return null; }
  }

  /* ---------- 1. Games that need an account ---------- */
  // A "Play Now" button says "Sign in to play" only when the game asks for an account (data-requires-account),
  // the account service address is set, and nobody is signed in. Otherwise the button is left exactly as written.
  function initGames() {
    var account = accountClient();
    if (!account || !account.isConfigured() || account.hasSession()) { return; }
    $all("a[data-play][data-requires-account='true']").forEach(function (link) {
      var game = link.getAttribute("href");
      var hidden = $(".visually-hidden", link);
      link.href = "/account/?next=" + encodeURIComponent(game);
      link.firstChild.nodeValue = "Sign in to play";
      if (hidden) { link.appendChild(hidden); }
    });
  }

  /* ---------- 2. Account button in the header ---------- */
  function initAccountLink() {
    var account = accountClient();
    if (!account || !account.isConfigured()) { return; }
    var label = $("[data-account-link] span");
    if (!label) { return; }
    var link = $("[data-account-link]");
    var icon = $("svg", link);
    var photo = null;
    function update() {
      label.textContent = account.hasSession() ? account.username() : "Sign in";
      // The account's profile picture (the same one every game shows), in place of the generic person icon.
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
    if (account.onChange) { account.onChange(update); }   // signing in or out on the Account page updates the button at once
    if (account.hasSession() && account.refreshAvatar) { account.refreshAvatar(false).then(update); }   // at most one check an hour
  }

  /* ---------- 3. Copy the contact email ---------- */
  function initCopyEmail() {
    var email = String(CONFIG.email || "").trim();
    var actions = $("#contact-fallback .contact-actions");
    if (!actions || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { return; }

    var copy = make("button", "btn btn-secondary", "Copy email address");
    copy.type = "button";
    copy.id = "copy-email";
    actions.appendChild(copy);

    var status = make("p", "copy-status");
    status.id = "copy-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    actions.parentNode.appendChild(status);

    function say(message) {
      status.textContent = message;
      window.setTimeout(function () { status.textContent = ""; }, 4000);
    }
    copy.addEventListener("click", function () {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(
          function () { say("Email address copied."); },
          function () { say("Couldn't copy automatically. Please select the address and copy it."); }
        );
      } else {
        say("Couldn't copy automatically. Please select the address and copy it.");
      }
    });
  }

  /* ---------- 4. Mobile menu ---------- */
  function initMenu() {
    var toggle = $(".nav-toggle");
    var nav = $("#site-nav");
    if (!toggle || !nav) { return; }

    var wide = window.matchMedia("(min-width: 1100px)");

    function isOpen() { return toggle.getAttribute("aria-expanded") === "true"; }
    function setOpen(open) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      nav.classList.toggle("is-open", open);
    }

    toggle.addEventListener("click", function () { setOpen(!isOpen()); });

    // Choosing a link closes the menu.
    nav.addEventListener("click", function (event) {
      if (event.target.closest && event.target.closest("a")) { setOpen(false); }
    });

    // Escape closes the menu and puts focus back on the button.
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && isOpen()) { setOpen(false); toggle.focus(); }
    });

    // Tapping anywhere outside closes it too.
    document.addEventListener("click", function (event) {
      if (isOpen() && !nav.contains(event.target) && !toggle.contains(event.target)) { setOpen(false); }
    });

    // If the window becomes wide (e.g. phone rotated), reset to the desktop layout.
    function onResize() { if (wide.matches) { setOpen(false); } }
    if (wide.addEventListener) { wide.addEventListener("change", onResize); } else { wide.addListener(onResize); }
  }

  /* ---------- 5. Footer year ---------- */
  function initYear() {
    var year = String(new Date().getFullYear());
    $all("[data-year]").forEach(function (node) { node.textContent = year; });
  }

  /* ---------- 6. Fade-in on scroll ---------- */
  function initReveal() {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) { return; }   // Content just stays visible.

    var items = $all(".reveal");
    if (!items.length) { return; }

    // This class is what makes the CSS hide the items first. Added only now, so a
    // script error earlier in this file can never leave the page blank.
    document.documentElement.classList.add("reveal-ready");

    items.forEach(function (item) {
      var position = Array.prototype.indexOf.call(item.parentElement.children, item);
      item.style.setProperty("--reveal-delay", (position % 4) * 0.08 + "s");
    });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        var node = entry.target;
        node.classList.add("is-visible");
        observer.unobserve(node);
        // After the fade finishes, drop the helper classes so hover effects are instant again.
        window.setTimeout(function () {
          node.classList.remove("reveal", "is-visible");
          node.style.removeProperty("--reveal-delay");
        }, 1500);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });

    items.forEach(function (item) { observer.observe(item); });
  }

  /* ---------- run everything ---------- */
  // Each job runs on its own, so an error in one can never stop the menu or the page from working.
  function run(job) {
    try { job(); } catch (error) {
      if (window.console && console.error) { console.error("Atherbyte site:", error); }
    }
  }

  run(initGames);
  run(initAccountLink);
  run(initCopyEmail);
  run(initMenu);
  run(initYear);
  run(initReveal);
})();
