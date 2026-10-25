/*
  main.js — the small amount of behaviour the Atherbyte Studio site needs.
  No libraries. Each job is its own function; the list at the bottom runs them.

    1. buildGameCards   Builds the cards from js/games-data.js
    2. applyConfig      Adds the email buttons / testimonials / portfolio to the
                        page from the real details in js/site-config.js
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
      // If a picture is missing or fails to load, drop the empty picture box instead of showing a broken image.
      img.addEventListener("error", function () {
        if (media.parentNode) { media.parentNode.removeChild(media); }
      });
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
      // Optional "Details" button to the game's page on this site (only for addresses that start with "/").
      if (typeof item.page === "string" && /^\/(?!\/)/.test(item.page)) {
        var more = make("a", "btn btn-secondary", "Details");
        more.href = item.page;
        more.appendChild(make("span", "visually-hidden", " about " + item.title));
        actions.appendChild(more);
      }
      body.appendChild(actions);
    }

    card.appendChild(body);
    return card;
  }

  function buildGameCards() {
    var grid = $("#game-grid");
    if (!grid) { return; }

    // Only entries that have a title and a description can become a card. A broken or
    // half-finished entry is skipped; it never stops the other games from showing.
    var valid = (Array.isArray(GAMES) ? GAMES : []).filter(function (game) {
      return game && typeof game.title === "string" && game.title &&
             typeof game.description === "string" && game.description;
    });
    if (!valid.length) { return; }   // keep the ready-made cards from index.html

    var cards = [];
    valid.forEach(function (game) {
      try { cards.push(buildCard(game, "Play Now")); } catch (e) { /* skip this one game */ }
    });
    if (!cards.length) { return; }

    while (grid.firstChild) { grid.removeChild(grid.firstChild); }
    cards.forEach(function (card) { grid.appendChild(card); });
  }

  /* ---------- 2. Settings from js/site-config.js ---------- */

  // The email buttons do not exist in the page until a real address is set.
  // They are created here, so nothing about email can show up before then.
  function applyEmail() {
    var email = String(CONFIG.email || "").trim();
    var slot = $("#contact-email-slot");
    if (!slot || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { return; }

    var actions = make("div", "contact-actions");

    var mail = make("a", "btn btn-primary", "Email us");
    mail.id = "contact-email-link";
    mail.href = "mailto:" + email + "?subject=" + encodeURIComponent("Project inquiry for Atherbyte Studio");
    actions.appendChild(mail);

    var copy = make("button", "btn btn-secondary", "Copy email address");
    copy.type = "button";
    copy.id = "copy-email";
    actions.appendChild(copy);

    var note = make("p", "contact-note", "Or write to ");
    note.appendChild(make("span", "contact-email", email));

    var status = make("p", "copy-status");
    status.id = "copy-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");

    slot.className = "contact-state";
    slot.appendChild(actions);
    slot.appendChild(note);
    slot.appendChild(status);

    // Replace the plain no-JavaScript email link with the full set of buttons
    var fallback = $("#contact-fallback");
    if (fallback && fallback.parentNode) { fallback.parentNode.removeChild(fallback); }

    // "Ask about this" link on every service card
    $all(".service-card").forEach(function (card) {
      var heading = $("h3", card);
      var service = heading ? heading.textContent : "a project";
      var link = make("a", "service-inquiry link-arrow", "Ask about this");
      link.href = "mailto:" + email + "?subject=" + encodeURIComponent("Inquiry: " + service);
      card.appendChild(link);
    });

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

  // Builds a whole section (heading + content) and puts it just before the Contact section.
  function addSection(id, extraClass, eyebrow, title, content) {
    var contact = document.getElementById("contact");
    if (!contact) { return null; }
    var section = make("section", "section" + (extraClass ? " " + extraClass : ""));
    section.id = id;
    section.setAttribute("aria-labelledby", id + "-title");
    var container = make("div", "container");
    var head = make("div", "section-head");
    head.appendChild(make("p", "eyebrow", eyebrow));
    var heading = make("h2", "section-title", title);
    heading.id = id + "-title";
    head.appendChild(heading);
    container.appendChild(head);
    container.appendChild(content);
    section.appendChild(container);
    contact.parentNode.insertBefore(section, contact);
    return section;
  }

  function applyTestimonials() {
    var items = (CONFIG.testimonials || []).filter(function (t) { return t && t.quote && t.name; });
    if (!items.length) { return; }
    var list = make("div", "testimonial-grid");
    items.forEach(function (t) {
      var figure = make("figure", "testimonial reveal");
      figure.appendChild(make("blockquote", null, "“" + t.quote + "”"));
      var caption = make("figcaption");
      caption.appendChild(make("strong", null, t.name));
      if (t.role) { caption.appendChild(document.createTextNode(", " + t.role)); }
      figure.appendChild(caption);
      list.appendChild(figure);
    });
    addSection("testimonials", "", "Kind words", "What clients say.", list);
  }

  function applyPortfolio() {
    var projects = (CONFIG.clientProjects || []).filter(function (p) { return p && p.title && p.description; });
    if (!projects.length) { return; }
    var grid = make("div", "game-grid");
    projects.forEach(function (p) { grid.appendChild(buildCard(p, "View project")); });
    addSection("portfolio", "section-alt", "Portfolio", "Client projects.", grid);

    // Add "Portfolio" to the header menu and the footer links, just before "Contact".
    $all(".nav-list, .footer-links").forEach(function (list) {
      var item = make("li");
      var link = make("a", null, "Portfolio");
      link.href = "#portfolio";
      item.appendChild(link);
      list.insertBefore(item, list.lastElementChild);
    });
  }

  function applyConfig() {
    applyEmail();
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
  // Each job runs on its own, so an error in one (for example bad data for a game)
  // can never stop the menu, the email buttons or the page from working.
  function run(job) {
    try { job(); } catch (error) {
      if (window.console && console.error) { console.error("Atherbyte site:", error); }
    }
  }

  run(buildGameCards);   // first, so the cards exist before the fade-in is set up
  run(applyConfig);
  run(initMenu);
  run(initActiveLink);
  run(initYear);
  run(initReveal);
})();
