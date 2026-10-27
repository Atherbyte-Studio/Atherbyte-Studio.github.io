/*
  account-page.js: the behaviour of /account/ (sign in, create account, profile).
  Needs js/site-config.js and js/atherbyte-account.js to be loaded first. All text from the server or the visitor
  is inserted as plain text (textContent), never as HTML.
*/
(function () {
  "use strict";

  var A = window.AtherbyteAccount;
  var CFG = (window.ATHERBYTE_CONFIG && window.ATHERBYTE_CONFIG.account) || {};
  var FEATURES = CFG.features || {};
  function $(id) { return document.getElementById(id); }
  if (!A || !$("view-guest")) { return; }

  var client = A.get();
  var params = new URLSearchParams(window.location.search);
  var NEXT = A.safeNext(params.get("next") || "", window.location.origin);

  var notice = $("acc-notice");
  var views = { loading: $("view-loading"), guest: $("view-guest"), user: $("view-user") };

  /* ---------- small helpers ---------- */
  function showView(name) {
    Object.keys(views).forEach(function (k) { views[k].hidden = k !== name; });
  }
  function say(kind, text) {
    if (!text) { notice.hidden = true; notice.textContent = ""; return; }
    notice.className = "notice notice-" + kind;
    notice.textContent = text;
    notice.hidden = false;
  }
  function setBusy(button, busy, busyText) {
    var label = button.querySelector(".btn-label");
    if (busy) { button.dataset.label = label.textContent; label.textContent = busyText; }
    else if (button.dataset.label) { label.textContent = button.dataset.label; }
    button.disabled = busy;
    button.setAttribute("aria-busy", busy ? "true" : "false");
  }
  function formError(form, text) {
    var p = form.querySelector(".form-error");
    p.textContent = text || "";
    p.hidden = !text;
  }

  /* ---------- tabs ---------- */
  var tabs = { login: $("tab-login"), register: $("tab-register") };
  var panels = { login: $("panel-login"), register: $("panel-register") };
  function selectTab(name, focus) {
    Object.keys(tabs).forEach(function (k) {
      var on = k === name;
      tabs[k].setAttribute("aria-selected", String(on));
      tabs[k].tabIndex = on ? 0 : -1;
      panels[k].hidden = !on;
    });
    if (focus) { tabs[name].focus(); }
  }
  Object.keys(tabs).forEach(function (k) {
    tabs[k].addEventListener("click", function () { selectTab(k); });
    tabs[k].addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") { selectTab(k === "login" ? "register" : "login", true); }
    });
  });

  /* ---------- show / hide password ---------- */
  Array.prototype.forEach.call(document.querySelectorAll("[data-toggle-for]"), function (btn) {
    btn.addEventListener("click", function () {
      var input = $(btn.getAttribute("data-toggle-for"));
      var show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.textContent = show ? "Hide" : "Show";
      btn.setAttribute("aria-pressed", String(show));
    });
  });

  /* ---------- the Cloudflare security check (Turnstile), only when a site key is set ---------- */
  var SITE_KEY = typeof CFG.turnstileSiteKey === "string" ? CFG.turnstileSiteKey.trim() : "";
  var captcha = { login: { id: null, token: "" }, register: { id: null, token: "" } };
  function renderCaptcha() {
    if (!window.turnstile) { return; }
    Object.keys(captcha).forEach(function (name) {
      var holder = document.querySelector('[data-captcha-for="' + name + '"]');
      if (!holder || captcha[name].id !== null) { return; }
      captcha[name].id = window.turnstile.render(holder, {
        sitekey: SITE_KEY, theme: "dark",
        callback: function (token) { captcha[name].token = token; },
        "expired-callback": function () { captcha[name].token = ""; },
        "error-callback": function () { captcha[name].token = ""; }
      });
    });
  }
  function loadCaptcha() {
    if (!SITE_KEY || window.turnstile) { renderCaptcha(); return; }
    window.__atherbyteTurnstileReady = renderCaptcha;
    var s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__atherbyteTurnstileReady";
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
  }
  function captchaToken(name) { return SITE_KEY ? captcha[name].token : ""; }
  function resetCaptcha(name) {
    captcha[name].token = "";
    if (window.turnstile && captcha[name].id !== null) { try { window.turnstile.reset(captcha[name].id); } catch (e) { /* ignore */ } }
  }

  /* ---------- after a successful sign in ---------- */
  function goNextOrProfile() {
    if (NEXT) { window.location.assign(NEXT); return; }
    renderUser();
  }

  /* ---------- sign in ---------- */
  panels.login.addEventListener("submit", function (e) {
    e.preventDefault();
    var form = panels.login, button = form.querySelector('button[type="submit"]');
    formError(form, "");
    say("", "");
    if (SITE_KEY && !captchaToken("login")) { formError(form, A.messageFor("captcha_missing")); return; }
    setBusy(button, true, "Signing in…");
    client.login($("login-username").value.trim(), $("login-password").value, captchaToken("login")).then(function (r) {
      setBusy(button, false);
      resetCaptcha("login");
      if (!r.ok) { formError(form, r.message); return; }
      $("login-password").value = "";
      if (!r.signedIn) { formError(form, A.messageFor("bad_response")); return; }
      say("success", "Signed in. Welcome back, " + r.user.username + ".");
      goNextOrProfile();
    });
  });

  /* ---------- create account ---------- */
  panels.register.addEventListener("submit", function (e) {
    e.preventDefault();
    var form = panels.register, button = form.querySelector('button[type="submit"]');
    formError(form, "");
    say("", "");
    if (!$("reg-ack").checked) { formError(form, "Please tick the box to confirm you understand the recovery warning."); $("reg-ack").focus(); return; }
    if (SITE_KEY && !captchaToken("register")) { formError(form, A.messageFor("captcha_missing")); return; }
    setBusy(button, true, "Creating your account…");
    client.register($("reg-username").value.trim(), $("reg-password").value, captchaToken("register")).then(function (r) {
      setBusy(button, false);
      resetCaptcha("register");
      if (!r.ok) { formError(form, r.message); return; }
      $("reg-password").value = "";
      if (!r.signedIn) {
        selectTab("login");
        $("login-username").value = r.user && r.user.username || "";
        say("success", "Account created. Please sign in with your new username and password.");
        return;
      }
      say("success", "Account created. You are signed in as " + r.user.username + ". Remember: without a verified recovery email, a lost password cannot be recovered.");
      goNextOrProfile();
    });
  });

  /* ---------- the signed-in view ---------- */
  function renderUser(profile) {
    var name = profile ? profile.username : client.username();
    var verified = !!(profile && profile.recovery_email_verified === true);
    $("user-name").textContent = name;
    var badge = $("user-recovery-badge");
    badge.textContent = verified ? "Recovery email verified" : "No verified recovery email";
    badge.className = "badge " + (verified ? "badge-ok" : "badge-warn");

    $("email-unverified").hidden = verified;
    $("email-verified").hidden = !verified;
    var enableEmail = FEATURES.recoveryEmail === true;
    Array.prototype.forEach.call($("email-form").querySelectorAll("input, button"), function (el) { el.disabled = !enableEmail; });
    $("email-soon").hidden = enableEmail;

    // Pictures: locked until the email is verified. Even then, the upload control only exists once that feature is switched on.
    $("avatar-locked").hidden = verified;
    $("avatar-soon").hidden = !verified || FEATURES.avatarUpload === true;

    var link = $("continue-link");
    if (NEXT) { link.href = NEXT; link.firstChild.nodeValue = "Continue"; }
    showView("user");
  }

  $("signout").addEventListener("click", function () {
    var button = $("signout");
    setBusy(button, true, "Signing out…");
    client.logout().then(function () {
      setBusy(button, false);
      say("info", "You are signed out.");
      showView("guest");
      selectTab("login");
    });
  });

  /* ---------- start ---------- */
  function start() {
    if (!client.isConfigured()) {
      say("warn", A.messageFor("not_configured_client") + " The account service has not been connected yet.");
      return;
    }
    if (!client.storageAvailable()) {
      say("warn", "Your browser is blocking site storage, so you will be signed out when you close this page and games won't see your sign-in.");
    }
    selectTab(window.location.hash === "#register" ? "register" : "login");

    if (!client.hasSession()) { showView("guest"); loadCaptcha(); return; }

    showView("loading");
    client.me().then(function (r) {
      if (r.ok) { renderUser(r.profile); return; }
      if (r.status === 401 || r.code === "unauthorized" || r.code === "invalid_refresh" || r.code === "profile_not_found") {
        say("info", A.messageFor("unauthorized"));
        showView("guest"); loadCaptcha();
        return;
      }
      // The service could not be reached: keep the visitor signed in and show what we saved.
      say("warn", r.message + " Showing the details saved on this device.");
      renderUser(null);
    });
  }

  // Signing out in another tab updates this one.
  client.onChange(function (s) { if (!s && views.user.hidden === false) { showView("guest"); loadCaptcha(); } });

  start();
})();
