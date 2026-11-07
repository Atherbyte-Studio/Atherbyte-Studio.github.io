/*
  contact.js: the project inquiry form on /contact/ and /ar/contact/.

  The form posts to the Atherbyte API (a Cloudflare Worker, POST /v1/contact), which checks the Cloudflare
  Turnstile token, rate-limits by IP, validates every field again and stores the message in Supabase.
  This script only validates early, shows the real result and never claims success unless the API says so.
  If the API address is not configured, or the API is down, the visitor is told nothing was saved and is
  pointed to the email address.
*/
(function () {
  "use strict";
  var form = document.getElementById("contact-form");
  if (!form) { return; }

  var config = (window.ATHERBYTE_CONFIG && window.ATHERBYTE_CONFIG.account) || {};
  var apiBase = String(config.apiBaseUrl || "").replace(/\/+$/, "");
  var siteKey = String(config.turnstileSiteKey || "");
  var msgs = {};
  try { msgs = JSON.parse(document.getElementById("cf-msgs").textContent); } catch (e) { msgs = {}; }

  var status = document.getElementById("cf-status");
  var send = document.getElementById("cf-send");
  var label = send.querySelector(".btn-label");
  var widgetId = null, token = "", loading = false;

  function $(name) { return form.elements[name]; }
  function say(text, ok) {
    status.hidden = false;
    status.className = "form-status " + (ok ? "is-ok" : "is-err");
    status.textContent = text;
  }
  function fieldError(name, text) {
    var el = $(name), box = document.getElementById("cf-" + (name === "description" ? "desc" : name) + "-err");
    if (!el || !box) { return; }
    el.setAttribute("aria-invalid", text ? "true" : "false");
    box.hidden = !text; box.textContent = text || "";
  }

  /* ---- Turnstile: loaded only when the visitor starts the form ---- */
  function loadCaptcha() {
    if (loading || !siteKey || !apiBase) { return; }
    loading = true;
    var s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = function () {
      if (!window.turnstile) { return; }
      widgetId = window.turnstile.render("#cf-captcha", {
        sitekey: siteKey, theme: "dark", language: form.getAttribute("data-lang") || "en",
        callback: function (t) { token = t; },
        "expired-callback": function () { token = ""; },
        "error-callback": function () { token = ""; }
      });
    };
    document.head.appendChild(s);
  }
  form.addEventListener("focusin", loadCaptcha, { once: true });
  form.addEventListener("pointerdown", loadCaptcha, { once: true });

  if (!apiBase) { say(msgs.unavailable, false); }

  function validate() {
    var bad = false;
    function check(name, ok, text) { fieldError(name, ok ? "" : text); if (!ok) { bad = true; } }
    check("name", $("name").value.trim().length >= 1, msgs.name);
    check("email", /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test($("email").value.trim()), msgs.email);
    check("type", !!$("type").value, msgs.type);
    check("description", $("description").value.trim().length >= 20, msgs.desc);
    var link = $("link").value.trim();
    check("link", !link || /^https?:\/\/[^\s]+\.[^\s]+$/i.test(link), msgs.link);
    return !bad;
  }

  function busy(on) {
    send.disabled = on; send.setAttribute("aria-disabled", String(on));
    label.textContent = on ? msgs.sending : msgs.send;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    status.hidden = true;
    if (!apiBase) { say(msgs.unavailable, false); return; }
    if (!validate()) { say(msgs.invalid, false); var first = form.querySelector('[aria-invalid="true"]'); if (first) { first.focus(); } return; }
    if (siteKey && !token) { loadCaptcha(); say(msgs.captcha, false); return; }

    busy(true);
    var body = {
      name: $("name").value.trim(), email: $("email").value.trim(), type: $("type").value,
      description: $("description").value.trim(), budget: $("budget").value, method: $("method").value,
      link: $("link").value.trim(), lang: form.getAttribute("data-lang") || "en",
      website: $("website").value, turnstileToken: token
    };
    var controller = window.AbortController ? new AbortController() : null;
    var timer = window.setTimeout(function () { if (controller) { controller.abort(); } }, 15000);
    fetch(apiBase + "/v1/contact", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      signal: controller ? controller.signal : undefined
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) { return { status: res.status, data: data }; });
    }).then(function (r) {
      if (r.status === 201 && r.data && r.data.ok === true) {
        say(msgs.ok, true); form.reset(); token = "";
        if (widgetId !== null && window.turnstile) { window.turnstile.reset(widgetId); }
        return;
      }
      if (r.status === 429) { say(msgs.limit, false); }
      else if (r.status === 400 && r.data && r.data.error === "captcha_failed") { say(msgs.captcha, false); }
      else if (r.status === 400) { say(msgs.invalid, false); }
      else if (r.status === 404 || r.status === 503) { say(msgs.unavailable, false); }
      else { say(msgs.fail, false); }
      token = "";
      if (widgetId !== null && window.turnstile) { window.turnstile.reset(widgetId); }
    }).catch(function () {
      say(msgs.network, false);
      token = "";
      if (widgetId !== null && window.turnstile) { window.turnstile.reset(widgetId); }
    }).then(function () { window.clearTimeout(timer); busy(false); });
  });
})();
