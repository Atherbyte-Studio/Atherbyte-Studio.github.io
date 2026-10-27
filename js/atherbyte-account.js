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
    timeout: "The account service took too long to answer. Please try again.",
    network: "Could not reach the account service. Check your connection and try again.",
    bad_response: "The account service sent something unexpected. Please try again."
  };
  function messageFor(code) {
    return MESSAGES[code] || "Something went wrong. Please try again.";
  }

  /* ---------- validation (mirrors the server; the server always checks again) ---------- */
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
      try { if (storage) { storage.removeItem(SESSION_KEY); } } catch (e) { /* ignore */ }
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
      if (init.token) { headers.Authorization = "Bearer " + init.token; }
      var opts = { method: init.method || "GET", headers: headers, credentials: "omit", cache: "no-store" };
      if (init.body !== undefined) { opts.body = JSON.stringify(init.body); }
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
          return request(path, { method: init.method, body: init.body, token: s.access_token });
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
          return { ok: true, profile: r.data };
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
    validateUsername: validateUsername, validatePassword: validatePassword,
    safeNext: safeNext, normalizeBase: normalizeBase, create: create, get: get
  };
});
