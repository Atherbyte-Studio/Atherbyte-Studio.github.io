/*
  main.js — the small amount of behaviour the Atherbyte Studio site needs.
  No libraries. Each job is its own function; the list at the bottom runs them.

    1. buildGameCards   Builds the cards from js/games-data.js
    2. applyConfig      Shows email / social links / testimonials / portfolio
                        only when js/site-config.js contains real details
    3. initMenu         The mobile menu button
    4. initActiveLink   Highlights the menu link of the section you are viewing
    5. initYear         Keeps the footer year current
    6. initReveal       Gentle fade-in as sections scroll into view
*/
(function () {
  "use strict";

  var GAMES = window.ATHERBYTE_GAMES || [];
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

  // Only allow normal web links, never things like "javascript:...".
  function isWebUrl(url) { return typeof url === "string" && /^https?:\/\//i.test(url); }

  /* ---------- 1. Game (and portfolio) cards ---------- */
  function buildCard(item, buttonLabel) {
    var card = make("article", "game-card reveal");

    if (item.image) {
      var media = make("div", "game-media");
      var img = make("img");
      img.src = item.image;
      img.alt = item.imageAlt || (item.title + " artwork");
      img.width = 640;
      img.height = 400;
      img.loading = "lazy";
      img.decoding = "async";
      media.appendChild(img);
      card.appendChild(media);
    }

    var body = make("div", "game-body");
    if (item.category) { body.appendChild(make("span", "chip", item.category)); }
    body.appendChild(make("h3", "game-title", item.title));
    body.appendChild(make("p", "game-desc", item.description));

    if (item.tags && item.tags.length) {
      var tags = make("ul", "tag-list");
      item.tags.forEach(function (tag) { tags.appendChild(make("li", null, tag)); });
      body.appendChild(tags);
    }

    if (isWebUrl(item.url)) {
      var actions = make("div", "game-actions");
      var link = make("a", "btn btn-primary has-arrow");
      link.href = item.url;
      link.target = "_blank";
      link.rel = "noopener";
      link.appendChild(document.createTextNode(buttonLabel));
      link.appendChild(make("span", "visually-hidden", " " + item.title + " (opens in a new tab)"));
      actions.appendChild(link);
      body.appendChild(actions);
    }

    card.appendChild(body);
    return card;
  }

  function buildGameCards() {
    var grid = $("#game-grid");
    if (!grid) { return; }
    if (!GAMES.length) {
      grid.appendChild(make("p", "section-lead", "New games are on the way."));
      return;
    }
    GAMES.forEach(function (game) { grid.appendChild(buildCard(game, "Play Now")); });
  }

  /* ---------- 2. Settings from js/site-config.js ---------- */
  function renderSocialLinks(listSelector, wrapperSelector) {
    var list = $(listSelector);
    var wrapper = $(wrapperSelector);
    var links = (CONFIG.social || []).filter(function (s) { return s && s.label && isWebUrl(s.url); });
    if (!list || !wrapper || !links.length) { return; }
    links.forEach(function (s) {
      var li = make("li");
      var a = make("a", null, s.label);
      a.href = s.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      li.appendChild(a);
      list.appendChild(li);
    });
    wrapper.hidden = false;
  }

  function applyEmail() {
    var email = String(CONFIG.email || "").trim();
    var looksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!looksValid) { return; }   // No real address yet: every email action stays hidden.

    var pending = $("#contact-pending");
    var ready = $("#contact-ready");
    if (pending) { pending.hidden = true; }
    if (ready) { ready.hidden = false; }

    var mainLink = $("#contact-email-link");
    if (mainLink) {
      mainLink.href = "mailto:" + email + "?subject=" + encodeURIComponent("Project inquiry for Atherbyte Studio");
    }
    var text = $("#contact-email-text");
    if (text) { text.textContent = email; }

    // "Ask about this" links on the service cards
    $all(".service-inquiry").forEach(function (link) {
      var service = link.getAttribute("data-service") || "a project";
      link.href = "mailto:" + email + "?subject=" + encodeURIComponent("Inquiry: " + service);
      link.hidden = false;
    });

    // "Copy email address" button
    var copyButton = $("#copy-email");
    var status = $("#copy-status");
    if (copyButton) {
      copyButton.addEventListener("click", function () {
        function say(message) {
          if (!status) { return; }
          status.textContent = message;
          window.setTimeout(function () { status.textContent = ""; }, 4000);
        }
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
  }

  function applyTestimonials() {
    var items = (CONFIG.testimonials || []).filter(function (t) { return t && t.quote && t.name; });
    var section = $("#testimonials");
    var list = $("#testimonial-list");
    if (!section || !list || !items.length) { return; }
    items.forEach(function (t) {
      var figure = make("figure", "testimonial reveal");
      figure.appendChild(make("blockquote", null, "“" + t.quote + "”"));
      var caption = make("figcaption");
      caption.appendChild(make("strong", null, t.name));
      if (t.role) { caption.appendChild(document.createTextNode(", " + t.role)); }
      figure.appendChild(caption);
      list.appendChild(figure);
    });
    section.hidden = false;
  }

  function applyPortfolio() {
    var projects = (CONFIG.clientProjects || []).filter(function (p) { return p && p.title && p.description; });
    var section = $("#portfolio");
    var grid = $("#portfolio-grid");
    if (!section || !grid || !projects.length) { return; }
    projects.forEach(function (p) { grid.appendChild(buildCard(p, "View project")); });
    section.hidden = false;
    $all("[data-portfolio-link]").forEach(function (item) { item.hidden = false; });
  }

  function applyConfig() {
    applyEmail();
    renderSocialLinks("#contact-social-list", "#contact-social");
    renderSocialLinks("#footer-social-list", "#footer-social");
    applyTestimonials();
    applyPortfolio();
  }

  /* ---------- 3. Mobile menu ---------- */
  function initMenu() {
    var toggle = $(".nav-toggle");
    var nav = $("#site-nav");
    if (!toggle || !nav) { return; }

    var wide = window.matchMedia("(min-width: 820px)");

    function isOpen() { return toggle.getAttribute("aria-expanded") === "true"; }
    function setOpen(open) {
      toggle.setAttribute("aria-expanded", String(open));
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

  /* ---------- 4. Highlight the current section in the menu ---------- */
  function initActiveLink() {
    if (!("IntersectionObserver" in window)) { return; }
    var links = $all(".site-nav a[href^='#']");
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        links.forEach(function (a) { a.removeAttribute("aria-current"); });
        var active = byId[entry.target.id];
        if (active) { active.setAttribute("aria-current", "true"); }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });

    Object.keys(byId).forEach(function (id) {
      var section = document.getElementById(id);
      if (section) { observer.observe(section); }
    });
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
  buildGameCards();   // first, so the cards exist before the fade-in is set up
  applyConfig();
  initMenu();
  initActiveLink();
  initYear();
  initReveal();
})();
