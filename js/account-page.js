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
  var forgotPanel = $("panel-forgot");

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
    forgotPanel.hidden = true;
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
  var captcha = { login: { id: null, token: "" }, register: { id: null, token: "" }, forgot: { id: null, token: "" } };
  /* The sign-in and create-account widgets are drawn at once; the reset widget only when its form is opened. */
  function renderCaptcha(names) {
    if (!window.turnstile) { return; }
    (names || ["login", "register"]).forEach(function (name) {
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
  function renderVisible() {
    renderCaptcha();
    if (!forgotPanel.hidden) { renderCaptcha(["forgot"]); }
  }
  function loadCaptcha() {
    if (!SITE_KEY || window.turnstile) { renderVisible(); return; }
    window.__atherbyteTurnstileReady = renderVisible;
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

  /* ---------- forgot password ---------- */
  function showForgot(on) {
    if (!on) { selectTab("login"); return; }
    forgotPanel.hidden = false;
    panels.login.hidden = true;
    panels.register.hidden = true;
    Object.keys(tabs).forEach(function (k) { tabs[k].setAttribute("aria-selected", "false"); });
    $("forgot-done").hidden = true;
    formError(forgotPanel, "");
    if (!$("forgot-identifier").value) { $("forgot-identifier").value = $("login-username").value.trim(); }
    renderCaptcha(["forgot"]);
    $("forgot-identifier").focus();
  }
  $("forgot-link").addEventListener("click", function () { showForgot(true); });
  $("forgot-back").addEventListener("click", function () { showForgot(false); });
  forgotPanel.addEventListener("submit", function (e) {
    e.preventDefault();
    var button = forgotPanel.querySelector('button[type="submit"]'), done = $("forgot-done");
    formError(forgotPanel, "");
    done.hidden = true;
    say("", "");
    if (SITE_KEY && !captchaToken("forgot")) { formError(forgotPanel, A.messageFor("captcha_missing")); return; }
    setBusy(button, true, "Sending…");
    client.forgot($("forgot-identifier").value, captchaToken("forgot")).then(function (r) {
      setBusy(button, false);
      resetCaptcha("forgot");
      if (!r.ok) { formError(forgotPanel, r.message); return; }
      // The same words for every account, so the page never says whether one exists.
      done.textContent = "If that account has a verified recovery email, a reset link is on its way. It can take a few minutes, so check your spam folder too. The link works once and only for a short time.";
      done.hidden = false;
    });
  });

  /* ---------- after a successful sign in ---------- */
  function goNextOrProfile() {
    if (NEXT) { window.location.assign(NEXT); return; }
    renderUser();
    // Show the real recovery-email state right away (the quick view above only knows the username).
    refreshProfile(false, true);
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
  /* One place decides how the recovery email card looks: "none" (not verified), "pending" or "verified". */
  var emailStatus = "none";
  function setEmailState(status, hint) {
    var verified = status === "verified", pending = status === "pending";
    emailStatus = status;
    $("email-refresh").hidden = !pending;
    if (pending) { startWatching(); } else { stopWatching(); }
    var state = $("email-state");
    state.textContent = verified ? "Verified" : (pending ? "Waiting for confirmation" : "Not verified");
    state.className = "badge " + (verified ? "badge-ok" : (pending ? "badge-info" : "badge-warn"));
    $("email-unverified").hidden = verified;
    $("email-verified").hidden = !verified;
    $("email-hint").textContent = verified && hint ? hint : "";
    var note = $("email-pending");
    note.hidden = !pending;
    note.textContent = pending ? "We sent a confirmation link" + (hint ? " to " + hint : "") + ". Open it to finish. If it has not arrived after a few minutes, check your spam folder or send it again." : "";
    $("email-form").querySelector(".btn-label").textContent = pending ? "Send the link again" : "Send verification link";
  }

  /* While a confirmation is pending, the page asks the server again: when the visitor comes back to this tab, every
     15 seconds while it is visible (for about 10 minutes), and when they press the button. The link is usually opened
     in another tab or app, so without this the page would keep showing an old answer until it is reloaded. */
  var watchTimer = null, watchTicks = 0;
  function refreshProfile(manual, quiet) {
    if (!client.hasSession() || views.user.hidden) { return Promise.resolve(); }
    return client.me().then(function (r) {
      if (!r.ok) { if (manual) { say("warn", r.message); } return; }
      var before = emailStatus;
      renderUser(r.profile);
      if (!quiet && before !== "verified" && emailStatus === "verified") { say("success", "Your recovery email is now verified."); }
      else if (!quiet && manual && emailStatus === "pending") { say("info", "Still waiting for the confirmation. Open the link in the email we sent" + (r.profile && r.profile.recovery_email_hint ? " to " + r.profile.recovery_email_hint : "") + "."); }
    });
  }
  function startWatching() {
    if (watchTimer) { return; }
    watchTicks = 0;
    watchTimer = window.setInterval(function () {
      watchTicks += 1;
      if (watchTicks > 40) { stopWatching(); return; }
      if (document.visibilityState === "visible") { refreshProfile(false); }
    }, 15000);
  }
  function stopWatching() { if (watchTimer) { window.clearInterval(watchTimer); watchTimer = null; } }
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible" && emailStatus === "pending") { refreshProfile(false); } });
  window.addEventListener("focus", function () { if (emailStatus === "pending") { refreshProfile(false); } });
  $("email-refresh").addEventListener("click", function () {
    var b = $("email-refresh");
    b.disabled = true;
    refreshProfile(true).then(function () { b.disabled = false; });
  });

  panelsEmailInit();
  function panelsEmailInit() {
    var form = $("email-form");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var button = form.querySelector('button[type="submit"]');
      formError(form, "");
      var v = A.validateEmail($("email-input").value);
      if (!v.ok) { formError(form, A.messageFor("invalid_email")); $("email-input").focus(); return; }
      setBusy(button, true, "Sending…");
      client.setEmail(v.email).then(function (r) {
        setBusy(button, false);
        if (!r.ok) {
          if (r.code === "unauthorized") { say("info", A.messageFor("unauthorized")); showView("guest"); loadCaptcha(); return; }
          formError(form, r.message);
          return;
        }
        $("email-input").value = "";
        setEmailState("pending", r.hint);
        say("success", "Confirmation link sent. Open it from your email to finish.");
      });
    });
  }

  /* ---------- profile picture ---------- */
  // The upload form only exists for an account with a verified recovery email, and only once the feature is switched on in
  // js/site-config.js. The server checks both again on every upload, so this is a convenience, not the lock.
  var avatarBlob = null;
  var avatarPreviewUrl = "";
  function avatarMessage(kind, text) {
    var err = $("avatar-error"), status = $("avatar-status");
    err.hidden = kind !== "error" || !text; err.textContent = kind === "error" ? text : "";
    status.hidden = kind !== "ok" || !text; status.textContent = kind === "ok" ? text : "";
  }
  function showAvatar(url) {
    var img = $("avatar-img");
    if (avatarPreviewUrl && url !== avatarPreviewUrl) { URL.revokeObjectURL(avatarPreviewUrl); avatarPreviewUrl = ""; }
    $("avatar-initial").textContent = (client.username() || "?").charAt(0).toUpperCase();
    img.hidden = !url;
    if (url) { img.src = url; } else { img.removeAttribute("src"); }
    $("avatar-remove").hidden = !client.avatarUrl() || !!avatarBlob;
    $("avatar-save").hidden = !avatarBlob;
  }
  // Crops the middle square, scales it to 256 x 256 and re-encodes it (WebP, or JPEG where WebP is not available),
  // so the file is small and always a clean picture. Resolves to a Blob, or null when the browser cannot read the file.
  function prepareAvatar(file) {
    return new Promise(function (resolve) {
      var src = URL.createObjectURL(file);
      var image = new Image();
      image.onerror = function () { URL.revokeObjectURL(src); resolve(null); };
      image.onload = function () {
        URL.revokeObjectURL(src);
        var side = Math.min(image.naturalWidth, image.naturalHeight);
        if (!side) { resolve(null); return; }
        var canvas = document.createElement("canvas");
        canvas.width = 256; canvas.height = 256;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, 256, 256);
        var tries = [["image/webp", 0.85], ["image/webp", 0.7], ["image/jpeg", 0.85], ["image/jpeg", 0.6]];
        (function next(i) {
          if (i >= tries.length) { resolve(null); return; }
          canvas.toBlob(function (blob) {
            if (blob && blob.type === tries[i][0] && blob.size <= A.AVATAR_MAX_BYTES) { resolve(blob); } else { next(i + 1); }
          }, tries[i][0], tries[i][1]);
        })(0);
      };
      image.src = src;
    });
  }
  if ($("avatar-file")) {
    $("avatar-file").addEventListener("change", function () {
      var file = this.files && this.files[0];
      this.value = "";
      avatarMessage("", "");
      if (!file) { return; }
      if (["image/png", "image/jpeg", "image/webp"].indexOf(file.type) < 0) { avatarMessage("error", A.messageFor("invalid_image")); return; }
      if (file.size > 10 * 1024 * 1024) { avatarMessage("error", A.messageFor("image_too_large")); return; }
      prepareAvatar(file).then(function (blob) {
        if (!blob) { avatarMessage("error", A.messageFor("image_unusable")); return; }
        avatarBlob = blob;
        avatarPreviewUrl = URL.createObjectURL(blob);
        showAvatar(avatarPreviewUrl);
        avatarMessage("ok", "Preview only. Press Save picture to use it.");
      });
    });
    $("avatar-save").addEventListener("click", function () {
      var button = $("avatar-save");
      if (!avatarBlob) { return; }
      avatarMessage("", "");
      setBusy(button, true, "Saving…");
      client.uploadAvatar(avatarBlob).then(function (r) {
        setBusy(button, false);
        if (!r.ok) {
          if (r.code === "unauthorized") { say("info", A.messageFor("unauthorized")); showView("guest"); loadCaptcha(); return; }
          if (r.code === "email_not_verified") { $("avatar-editor").hidden = true; $("avatar-locked").hidden = false; }
          avatarMessage("error", r.message);
          return;
        }
        avatarBlob = null;
        showAvatar(client.avatarUrl());
        avatarMessage("ok", "Picture saved. It now shows everywhere you are signed in.");
      });
    });
    $("avatar-remove").addEventListener("click", function () {
      var button = $("avatar-remove");
      avatarMessage("", "");
      setBusy(button, true, "Removing…");
      client.removeAvatar().then(function (r) {
        setBusy(button, false);
        if (!r.ok) { avatarMessage("error", r.message); return; }
        showAvatar("");
        avatarMessage("ok", "Picture removed.");
      });
    });
  }

  function renderUser(profile) {
    var name = profile ? profile.username : client.username();
    var status = profile && typeof profile.recovery_email_status === "string" ? profile.recovery_email_status
      : (profile && profile.recovery_email_verified === true ? "verified" : "none");
    var verified = status === "verified";
    $("user-name").textContent = name;
    var badge = $("user-recovery-badge");
    badge.textContent = verified ? "Recovery email verified" : (status === "pending" ? "Recovery email waiting for confirmation" : "No verified recovery email");
    badge.className = "badge " + (verified ? "badge-ok" : (status === "pending" ? "badge-info" : "badge-warn"));
    setEmailState(status, profile && profile.recovery_email_hint);
    var enableEmail = FEATURES.recoveryEmail === true;
    Array.prototype.forEach.call($("email-form").querySelectorAll("input, button"), function (el) { el.disabled = !enableEmail; });
    $("email-soon").hidden = enableEmail;

    // Pictures: locked until the email is verified. Even then, the upload control only exists once that feature is switched on.
    $("avatar-locked").hidden = verified;
    $("avatar-soon").hidden = !verified || FEATURES.avatarUpload === true;
    $("avatar-editor").hidden = !(verified && FEATURES.avatarUpload === true);
    if (verified && FEATURES.avatarUpload === true) { avatarBlob = null; showAvatar(client.avatarUrl()); }

    var link = $("continue-link");
    if (NEXT) { link.href = NEXT; link.firstChild.nodeValue = "Continue"; }
    showView("user");
  }

  $("signout").addEventListener("click", function () {
    var button = $("signout");
    setBusy(button, true, "Signing out…");
    client.logout().then(function () {
      stopWatching();
      setBusy(button, false);
      say("info", "You are signed out.");
      showView("guest");
      selectTab("login");
    });
  });

  /* ---------- coming back from an email link (confirmation) ----------
     Supabase sends the visitor back here with a result in the address after "#". It may include sign-in tokens.
     We never use or store those: the result is only used to pick a message, then the address is cleaned. The real
     state always comes from the server (the card below), so a forged address can only change a message. */
  function returnFromLink() {
    var fromHash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    var fromQuery = new URLSearchParams(window.location.search);
    var QUERY_KEYS = ["error", "error_code", "message"];     // the only things we read from the query: "next" etc. stay untouched
    function get(k) { return fromHash.get(k) || (QUERY_KEYS.indexOf(k) >= 0 ? fromQuery.get(k) : null) || ""; }
    function has(k) { return fromHash.has(k) || (QUERY_KEYS.indexOf(k) >= 0 && fromQuery.has(k)); }
    if (!(has("error") || has("error_code") || has("message") || fromHash.has("access_token") || fromHash.has("type"))) { return null; }
    var result;
    if (has("error") || has("error_code")) { result = get("error_code") === "otp_expired" ? "expired" : "failed"; }
    else if (/confirmation link accepted|other email/i.test(get("message"))) { result = "second_step"; }
    else { result = "opened"; }
    try {
      var keep = new URLSearchParams(window.location.search);
      QUERY_KEYS.forEach(function (k) { keep.delete(k); });
      var qs = keep.toString();
      window.history.replaceState(null, "", window.location.pathname + (qs ? "?" + qs : ""));
    } catch (e) { /* ignore */ }
    return result;
  }
  function returnMessage(result, signedIn) {
    if (result === "expired") { say("warn", "That email link has expired or was already used. Send a new one from your account page."); }
    else if (result === "failed") { say("warn", "That email link did not work. Please send a new one from your account page."); }
    else if (result === "second_step") { say("warn", "Your link was accepted, but the email change is not finished: the service is still waiting for a second confirmation that cannot be completed from this account. This is a setting on our side, not a mistake of yours. Your status below is accurate."); }
    else if (result === "opened") { say("info", signedIn ? "Thanks for opening the link. Your recovery email status is shown below." : "Thanks for opening the link. Sign in to see your recovery email status."); }
  }

  /* ---------- start ---------- */
  function start() {
    if (!client.isConfigured()) {
      say("warn", A.messageFor("not_configured_client") + " The account service has not been connected yet.");
      return;
    }
    if (!client.storageAvailable()) {
      say("warn", "Your browser is blocking site storage, so you will be signed out when you close this page and games won't see your sign-in.");
    }
    var returned = returnFromLink();
    selectTab(window.location.hash === "#register" ? "register" : "login");

    if (!client.hasSession()) { showView("guest"); loadCaptcha(); returnMessage(returned, false); return; }

    showView("loading");
    client.me().then(function (r) {
      if (r.ok) { renderUser(r.profile); returnMessage(returned, true); return; }
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
