/*
  atherbyte-account.js: the shared Atherbyte account client (website and games).

  What it does
    - Talks to the Atherbyte API (a Cloudflare Worker) at the address set in js/site-config.js
      (ATHERBYTE_CONFIG.account.apiBaseUrl). It holds NO secrets: the address and the Turnstile site key are public.
    - Keeps the signed-in session in this browser's localStorage under one key, so the website and the games
      (all served from https://atherbyte.online) share one sign-in. The session is sent in an Authorization header.
      Cookies are not used (they would not be shared with the API's address or the Android app).
    - Refreshes the session when it is about to expire, and signs out on the server too.

  What it is NOT
    - It does not make a game un-playable. A game is a static file in the visitor's browser, so a "sign in first"
      check here is a convenience, not security. Real protection happens on the server (the API refuses requests
      without a valid token) and, for the leaderboard, in checks that are still to be built.

  Use from a game page:
      <script src="/js/atherbyte-account.js"></script>
      <script>
        var account = AtherbyteAccount.get();
        if (!account.requireAccount()) { stop here: the visitor is being sent to /account/ }
      </script>
  (The game also needs ATHERBYTE_CONFIG loaded first: <script src="/js/site-config.js"></script>.)
*/
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== "undefined" && module.exports) { module.exports = api; }
  else { root.AtherbyteAccount = api; }
})(typeof self !== "undefined" ? self : this, function (root) {
  "use strict";

  var SESSION_KEY = "atherbyte-account-v1";
  /* The signed-in account's profile picture address, kept next to the session so every page and game on this site can
     show the same picture without asking the server each time. Only an address inside the project's public
     "avatars" bucket is ever kept. Removed on sign out. */
  var AVATAR_KEY = "atherbyte-avatar-v1";
  var AVATAR_RE = /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/avatars\/[0-9a-f-]{36}\/avatar(\?v=[0-9]+)?$/;
  var AVATAR_MAX_BYTES = 200 * 1024;
  var AVATAR_STALE_MS = 60 * 60 * 1000;   // pages re-read the picture from the server at most once an hour
  var USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
  var REFRESH_MARGIN_S = 30;       // refresh when fewer than 30 seconds are left
  var TIMEOUT_MS = 10000;
  var SITE_ORIGINS = ["https://atherbyte.online", "https://www.atherbyte.online"];

  /* Plain-English messages for every answer the API (or the network) can give. */
  var MESSAGES = {
    invalid_username: "Use 3 to 20 letters, numbers or underscores (no spaces).",
    username_reserved: "That name is reserved. Please choose another.",
    invalid_password: "Use a password of 8 to 72 characters that is different from your username.",
    username_taken: "That username is already taken. Please choose another.",
    weak_password: "That password is too easy to guess. Please choose a longer, less common one.",
    same_password: "Please choose a password different from your current one.",
    invalid_email: "That email address doesn't look right. Please check it and try again.",
    invalid_identifier: "Enter your username or your recovery email.",
    invalid_reset_link: "This reset link is not valid. It may have expired or already been used.",
    invalid_credentials: "Wrong username or password.",
    rate_limited: "Too many attempts. Please wait a minute and try again.",
    rate_limit_unavailable: "The account service is not ready yet. Please try again later.",
    captcha_failed: "The security check failed. Please try it again.",
    captcha_missing: "Please complete the security check first.",
    captcha_not_configured: "The security check is not set up yet, so accounts are not open yet.",
    captcha_unavailable: "The security check could not be reached. Please try again.",
    not_configured: "The account service is not set up yet. Please try again later.",
    not_configured_client: "Accounts are not available on this site yet.",
    origin_not_allowed: "This page is not allowed to use the account service.",
    unauthorized: "Your session has ended. Please sign in again.",
    invalid_refresh: "Your session has ended. Please sign in again.",
    auth_unavailable: "The account service is having trouble. Please try again later.",
    upstream_error: "The account service is having trouble. Please try again later.",
    upstream_unreachable: "The account service is having trouble. Please try again later.",
    internal_error: "Something went wrong on our side. Please try again later.",
    unsupported_media_type: "Something went wrong. Please reload the page and try again.",
    invalid_json: "Something went wrong. Please reload the page and try again.",
    body_too_large: "That input is too long.",
    profile_not_found: "Your profile could not be found. Please sign in again.",
    email_not_verified: "Profile pictures unlock after you verify a recovery email.",
    image_too_large: "That picture is too big. Please choose a smaller one.",
    invalid_image: "That file is not a picture we can use. Please choose a PNG, JPEG or WebP image.",
    invalid_image_size: "That picture is too small or too large. Please choose another one.",
    image_unusable: "Your browser could not read that picture. Please choose a PNG, JPEG or WebP image.",
    timeout: "The account service took too long to answer. Please try again.",
    network: "Could not reach the account service. Check your connection and try again.",
    bad_response: "The account service sent something unexpected. Please try again."
  };
  function messageFor(code) {
    return MESSAGES[code] || "Something went wrong. Please try again.";
  }

  /* ---------- validation (mirrors the server; the server always checks again) ---------- */
  var EMAIL_RE = /^[A-Za-z0-9._%+-]{1,64}@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$/;
  function validateEmail(input) {
    var v = typeof input === "string" ? input.trim().toLowerCase() : "";
    if (!v || v.length > 254 || !EMAIL_RE.test(v)) { return { ok: false, code: "invalid_email" }; }
    return { ok: true, email: v };
  }
  function maskEmail(v) { var at = v.lastIndexOf("@"); return v.charAt(0) + "***" + v.slice(at); }

  function validateUsername(input) {
    if (typeof input !== "string" || !USERNAME_RE.test(input) || !/[A-Za-z0-9]/.test(input)) {
      return { ok: false, code: "invalid_username" };
    }
    return { ok: true, username: input.toLowerCase() };
  }
  function utf8Length(s) {
    if (typeof TextEncoder !== "undefined") { return new TextEncoder().encode(s).length; }
    return unescape(encodeURIComponent(s)).length;
  }
  function validatePassword(password, username) {
    if (typeof password !== "string") { return { ok: false, code: "invalid_password" }; }
    var n = utf8Length(password);
    if (n < 8 || n > 72) { return { ok: false, code: "invalid_password" }; }
    if (username && password.toLowerCase() === String(username).toLowerCase()) { return { ok: false, code: "invalid_password" }; }
    return { ok: true };
  }

  /* ---------- "next": where to go after signing in. Only this site, never another one. ---------- */
  function safeNext(value, origin) {
    if (typeof value !== "string" || !value || value.length > 500 || /[\u0000-\u001f\u007f\\]/.test(value)) { return ""; }
    if (value.charAt(0) === "/" && value.charAt(1) !== "/") { return value; }
    try {
      var u = new URL(value);
      var allowed = SITE_ORIGINS.concat(origin ? [origin] : []);
      if (u.protocol === "https:" && allowed.indexOf(u.origin) >= 0) { return u.href; }
      if (origin && u.origin === origin) { return u.href; }
    } catch (e) { /* not a URL */ }
    return "";
  }

  /* The API address: https only (plain http only for a local test on this computer). Anything else means "not set". */
  function normalizeBase(value) {
    if (typeof value !== "string") { return ""; }
    var v = value.trim().replace(/\/+$/, "");
    if (/^https:\/\/[A-Za-z0-9.-]+(:\d+)?(\/[A-Za-z0-9._~\/-]*)?$/.test(v)) { return v; }
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(v)) { return v; }
    return "";
  }

  function safeLocalStorage() {
    try { var s = root.localStorage; s.getItem("atherbyte-probe"); return s; } catch (e) { return null; }
  }

  /* ---------- the client ---------- */
  function create(o) {
    o = o || {};
    var cfg = o.config || {};
    var base = normalizeBase(cfg.apiBaseUrl);
    var fetchImpl = o.fetch || (typeof root.fetch === "function" ? root.fetch.bind(root) : null);
    var now = o.now || function () { return Date.now(); };
    var storage = o.storage === undefined ? safeLocalStorage() : o.storage;
    var loc = o.location || root.location || null;
    var memory = null;            // used when storage is blocked (private mode): lasts until the page closes
    var listeners = [];
    var refreshing = null;

    function readSession() {
      var raw = null;
      try { raw = storage ? storage.getItem(SESSION_KEY) : null; } catch (e) { raw = null; }
      var s = null;
      if (raw) { try { s = JSON.parse(raw); } catch (e) { s = null; } }
      if (!s) { s = memory; }
      if (!s || typeof s !== "object" || typeof s.access_token !== "string" || typeof s.refresh_token !== "string" ||
          typeof s.expires_at !== "number" || !s.user || typeof s.user.username !== "string") { return null; }
      return s;
    }
    function notify() { listeners.forEach(function (fn) { try { fn(readSession()); } catch (e) { /* ignore */ } }); }
    function writeSession(s) {
      memory = s;
      try { if (storage) { storage.setItem(SESSION_KEY, JSON.stringify(s)); } } catch (e) { /* kept in memory */ }
      notify();
    }
    function clearSession() {
      memory = null;
      try { if (storage) { storage.removeItem(SESSION_KEY); storage.removeItem(AVATAR_KEY); } } catch (e) { /* ignore */ }
      notify();
    }

    /* The picture address cache (see AVATAR_KEY). It belongs to one account: another account's picture is never shown. */
    function readAvatarCache() {
      var s = readSession();
      var raw = null;
      try { raw = storage ? storage.getItem(AVATAR_KEY) : null; } catch (e) { raw = null; }
      var c = null;
      if (raw) { try { c = JSON.parse(raw); } catch (e) { c = null; } }
      if (!s || !c || typeof c !== "object" || c.id !== s.user.id) { return null; }
      return { url: typeof c.url === "string" && AVATAR_RE.test(c.url) ? c.url : null, at: Number(c.at) || 0 };
    }
    function writeAvatarCache(url) {
      var s = readSession();
      if (!s) { return; }
      var safe = typeof url === "string" && AVATAR_RE.test(url) ? url : null;
      try { if (storage) { storage.setItem(AVATAR_KEY, JSON.stringify({ id: s.user.id, url: safe, at: now() })); } } catch (e) { /* ignore */ }
      notify();
    }
    if (root.addEventListener && storage && !o.noStorageEvents) {
      root.addEventListener("storage", function (e) { if (e.key === SESSION_KEY || e.key === null) { notify(); } });
    }

    function buildSession(sessionData, user) {
      if (!sessionData || typeof sessionData.access_token !== "string" || typeof sessionData.refresh_token !== "string") { return null; }
      var exp = typeof sessionData.expires_at === "number" ? sessionData.expires_at
        : Math.floor(now() / 1000) + (Number(sessionData.expires_in) || 3600);
      return { access_token: sessionData.access_token, refresh_token: sessionData.refresh_token, expires_at: exp,
               user: { id: user && user.id, username: user && user.username } };
    }

    /* One request. Never throws: always resolves to { ok, status, data, code }. No cookies are sent or accepted. */
    function request(path, init) {
      init = init || {};
      if (!base) { return Promise.resolve({ ok: false, status: 0, code: "not_configured_client" }); }
      if (!fetchImpl) { return Promise.resolve({ ok: false, status: 0, code: "network" }); }
      var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) { ctrl.abort(); } }, TIMEOUT_MS);
      var headers = { Accept: "application/json" };
      if (init.body !== undefined) { headers["Content-Type"] = "application/json"; }
      if (init.rawBody !== undefined) { headers["Content-Type"] = init.contentType; }   // a picture, sent as it is
      if (init.token) { headers.Authorization = "Bearer " + init.token; }
      var opts = { method: init.method || "GET", headers: headers, credentials: "omit", cache: "no-store" };
      if (init.body !== undefined) { opts.body = JSON.stringify(init.body); }
      if (init.rawBody !== undefined) { opts.body = init.rawBody; }
      if (ctrl) { opts.signal = ctrl.signal; }
      return Promise.resolve().then(function () { return fetchImpl(base + path, opts); }).then(function (res) {
        clearTimeout(timer);
        if (res.status === 204) { return { ok: true, status: 204, data: null }; }
        return res.json().then(function (data) {
          return { ok: res.ok, status: res.status, data: data, code: res.ok ? null : (data && data.error) || "http_" + res.status };
        }, function () {
          return { ok: res.ok, status: res.status, data: null, code: res.ok ? null : "bad_response" };
        });
      }, function (err) {
        clearTimeout(timer);
        return { ok: false, status: 0, code: err && err.name === "AbortError" ? "timeout" : "network" };
      });
    }
    function fail(code, extra) {
      var r = { ok: false, code: code, message: messageFor(code) };
      if (extra) { Object.keys(extra).forEach(function (k) { r[k] = extra[k]; }); }
      return r;
    }

    function credentialsCall(path, username, password, turnstileToken, checkPasswordRules) {
      var u = validateUsername(username);
      if (!u.ok) { return Promise.resolve(fail(u.code)); }
      if (checkPasswordRules) {
        var p = validatePassword(password, u.username);
        if (!p.ok) { return Promise.resolve(fail(p.code)); }
      } else if (typeof password !== "string" || !password) {
        return Promise.resolve(fail("invalid_credentials"));
      }
      var body = { username: u.username, password: password };
      if (turnstileToken) { body.turnstileToken = turnstileToken; }
      return request(path, { method: "POST", body: body }).then(function (r) {
        if (!r.ok) { return fail(r.code); }
        var user = r.data && r.data.user;
        var session = buildSession(r.data && r.data.session, user);
        if (session) { writeSession(session); }
        return { ok: true, user: user, signedIn: !!session, warnings: (r.data && r.data.warnings) || [] };
      });
    }

    var client = {
      isConfigured: function () { return !!base; },
      apiBase: function () { return base; },
      storageAvailable: function () { return !!storage; },
      getSession: readSession,
      hasSession: function () { return !!readSession(); },
      username: function () { var s = readSession(); return s ? s.user.username : ""; },
      onChange: function (fn) { if (typeof fn === "function") { listeners.push(fn); } },
      messageFor: messageFor,

      register: function (username, password, turnstileToken) {
        return credentialsCall("/v1/auth/register", username, password, turnstileToken, true);
      },
      login: function (username, password, turnstileToken) {
        return credentialsCall("/v1/auth/login", username, password, turnstileToken, false);
      },

      /* Gets a new session using the refresh token. Resolves true when the session is fresh, false when it is not.
         A rejected refresh token ends the session; a network problem does not (the visitor stays signed in). */
      refresh: function () {
        if (refreshing) { return refreshing; }
        var s = readSession();
        if (!s) { return Promise.resolve(false); }
        refreshing = request("/v1/auth/refresh", { method: "POST", body: { refresh_token: s.refresh_token } }).then(function (r) {
          refreshing = null;
          if (r.ok) {
            var next = buildSession(r.data && r.data.session, s.user);
            if (next) { writeSession(next); return true; }
            return false;
          }
          if (r.code === "invalid_refresh") { clearSession(); }
          return false;
        });
        return refreshing;
      },

      /* A request that needs the signed-in user. Refreshes first when the token is about to expire, and once more
         if the server says it is no longer valid. If that fails too, the local session is cleared. */
      authed: function (path, init) {
        init = init || {};
        function once() {
          var s = readSession();
          if (!s) { return Promise.resolve({ ok: false, status: 401, code: "unauthorized" }); }
          return request(path, { method: init.method, body: init.body, rawBody: init.rawBody, contentType: init.contentType, token: s.access_token });
        }
        var s0 = readSession();
        var pre = s0 && s0.expires_at - Math.floor(now() / 1000) <= REFRESH_MARGIN_S ? client.refresh() : Promise.resolve(true);
        return pre.then(function () { return once(); }).then(function (r) {
          if (r.status !== 401) { return r; }
          return client.refresh().then(function (ok) {
            if (!ok) { return r; }   // a rejected refresh token already ended the session; a network problem keeps it
            return once().then(function (r2) { if (r2.status === 401) { clearSession(); } return r2; });
          });
        });
      },

      /* The signed-in user's profile from the server. */
      me: function () {
        return client.authed("/v1/me").then(function (r) {
          if (!r.ok) { return fail(r.code, { status: r.status }); }
          writeAvatarCache(r.data && r.data.avatar_url);
          return { ok: true, profile: r.data };
        });
      },

      /* ---- profile picture (the same one on the website and in every game) ---- */

      /* The address of the signed-in account's picture, or "" when there is none (or nobody is signed in).
         Read from this browser, so it costs nothing: use it as the src of an <img>. Call refreshAvatar() first if you
         want to be sure it is current. */
      avatarUrl: function () { var c = readAvatarCache(); return c && c.url ? c.url : ""; },

      /* Re-reads the picture from the server when this browser has not done so for an hour (or never). Always resolves
         to the current address, "" when there is none. Never throws, and a network problem keeps what is shown. */
      refreshAvatar: function (force) {
        var c = readAvatarCache();
        if (!readSession()) { return Promise.resolve(""); }
        if (!force && c && now() - c.at < AVATAR_STALE_MS) { return Promise.resolve(c.url || ""); }
        return client.me().then(function () { return client.avatarUrl(); }, function () { return client.avatarUrl(); });
      },

      /* Sends a picture (a Blob of image/png, image/jpeg or image/webp, 200 KB at most). The server only accepts it from
         an account with a verified recovery email, whatever this page shows. */
      uploadAvatar: function (blob) {
        if (!blob || typeof blob.size !== "number" || blob.size < 1) { return Promise.resolve(fail("invalid_image")); }
        if (blob.size > AVATAR_MAX_BYTES) { return Promise.resolve(fail("image_too_large")); }
        if (["image/png", "image/jpeg", "image/webp"].indexOf(blob.type) < 0) { return Promise.resolve(fail("invalid_image")); }
        return client.authed("/v1/me/avatar", { method: "POST", rawBody: blob, contentType: blob.type }).then(function (r) {
          if (!r.ok) { return fail(r.code, { status: r.status }); }
          var url = r.data && r.data.avatar_url;
          if (typeof url !== "string" || !AVATAR_RE.test(url)) { return fail("bad_response"); }
          writeAvatarCache(url);
          return { ok: true, avatarUrl: url };
        });
      },

      removeAvatar: function () {
        return client.authed("/v1/me/avatar/remove", { method: "POST" }).then(function (r) {
          if (!r.ok) { return fail(r.code, { status: r.status }); }
          writeAvatarCache(null);
          return { ok: true, avatarUrl: "" };
        });
      },

      /* Asks the server to send a confirmation link to this address. The answer is always "pending": the server
         does not say whether the address is already used elsewhere. */
      setEmail: function (email) {
        var e = validateEmail(email);
        if (!e.ok) { return Promise.resolve(fail(e.code)); }
        return client.authed("/v1/me/email", { method: "POST", body: { email: e.email } }).then(function (r) {
          if (!r.ok) { return fail(r.code, { status: r.status }); }
          return { ok: true, status: "pending", hint: maskEmail(e.email) };
        });
      },

      /* "Forgot password": username or email. The server always answers the same, so this does too. */
      forgot: function (identifier, turnstileToken) {
        var id = typeof identifier === "string" ? identifier.trim() : "";
        if (!id || id.length > 254) { return Promise.resolve(fail("invalid_identifier")); }
        var body = { identifier: id };
        if (turnstileToken) { body.turnstileToken = turnstileToken; }
        return request("/v1/auth/forgot", { method: "POST", body: body }).then(function (r) {
          return r.ok ? { ok: true } : fail(r.code, { status: r.status });
        });
      },

      /* Checks a reset link's token with the server before showing the form. Resolves { ok, username }. */
      checkResetToken: function (token) {
        if (typeof token !== "string" || !token) { return Promise.resolve(fail("invalid_reset_link")); }
        return request("/v1/me", { token: token }).then(function (r) {
          if (r.ok && r.data && typeof r.data.username === "string") { return { ok: true, username: r.data.username }; }
          if (r.status === 401 || r.status === 404) { return fail("invalid_reset_link"); }
          return fail(r.code || "bad_response", { status: r.status });
        });
      },

      /* Sets the new password. On success the server has signed every session out, so the local one goes too. */
      resetPassword: function (token, password, username) {
        var p = validatePassword(password, username);
        if (!p.ok) { return Promise.resolve(fail(p.code)); }
        return request("/v1/auth/reset", { method: "POST", body: { access_token: token, password: password } }).then(function (r) {
          if (!r.ok) { return fail(r.code, { status: r.status }); }
          clearSession();
          return { ok: true };
        });
      },

      /* Signs out here at once, then asks the server to revoke the session (best effort). */
      logout: function () {
        var s = readSession();
        clearSession();
        if (!s) { return Promise.resolve({ ok: true, serverRevoked: false }); }
        return request("/v1/auth/logout", { method: "POST", token: s.access_token }).then(function (r) {
          return { ok: true, serverRevoked: !!r.ok };
        });
      },

      /* For game pages and buttons: true when someone is signed in. Otherwise sends the visitor to the account page
         (which brings them back afterwards) and returns false. If accounts are not set up on this site, it returns
         true so nobody is locked out of a game by a missing service. */
      requireAccount: function (opts) {
        opts = opts || {};
        if (!base || readSession()) { return true; }
        var here = loc ? loc.pathname + loc.search + loc.hash : "/";
        var next = safeNext(opts.next || here, loc && loc.origin) || "/";
        if (loc && typeof loc.assign === "function") { loc.assign("/account/?next=" + encodeURIComponent(next)); }
        return false;
      }
    };
    return client;
  }

  var shared = null;
  /* The ready-made client for the page, built from ATHERBYTE_CONFIG.account in js/site-config.js. */
  function get() {
    if (!shared) {
      var cfg = (root.ATHERBYTE_CONFIG && root.ATHERBYTE_CONFIG.account) || {};
      shared = create({ config: cfg });
    }
    return shared;
  }

  return {
    SESSION_KEY: SESSION_KEY, MESSAGES: MESSAGES, messageFor: messageFor,
    validateUsername: validateUsername, validatePassword: validatePassword, validateEmail: validateEmail, maskEmail: maskEmail,
    safeNext: safeNext, normalizeBase: normalizeBase, create: create, get: get,
    isAvatarUrl: function (v) { return typeof v === "string" && AVATAR_RE.test(v); }, AVATAR_MAX_BYTES: AVATAR_MAX_BYTES, AVATAR_KEY: AVATAR_KEY
  };
});
