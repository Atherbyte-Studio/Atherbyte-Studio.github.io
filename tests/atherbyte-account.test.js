// Unit tests for js/atherbyte-account.js. Run: node --test tests/
// No network: every call goes to a fake fetch. Nothing here is published as part of the site's pages.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../js/atherbyte-account.js');

const BASE = 'https://api.example.workers.dev';
const KEY = A.SESSION_KEY;
function memStorage() { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m }; }
function res(status, body) { return { status, ok: status >= 200 && status < 300, json: async () => { if (body === undefined) throw new Error('no body'); return body; } }; }
function make(handler, extra = {}) {
  const calls = [];
  const storage = extra.storage || memStorage();
  const fetch = async (url, opts) => { calls.push({ url, opts }); return handler(url.replace(BASE, ''), opts, calls.length); };
  const loc = { pathname: '/games/', search: '', hash: '', origin: 'https://atherbyte.online', assigned: null, assign(u) { this.assigned = u; } };
  const client = A.create({ config: { apiBaseUrl: extra.base === undefined ? BASE : extra.base }, fetch, storage, location: loc, now: extra.now, noStorageEvents: true });
  return { client, calls, storage, loc };
}
const SESSION = { access_token: 'a1', refresh_token: 'r1', expires_at: 4102444800, token_type: 'bearer' };
const USER = { id: '00000000-0000-4000-8000-000000000001', username: 'alice_01' };

test('validation mirrors the server rules', () => {
  assert.equal(A.validateUsername('Ali_99').username, 'ali_99');
  for (const bad of ['ab', 'a'.repeat(21), 'a b', 'عربي', '___', '', null, "a'b"]) assert.equal(A.validateUsername(bad).ok, false, String(bad));
  assert.equal(A.validatePassword('12345678').ok, true);
  assert.equal(A.validatePassword('short').ok, false);
  assert.equal(A.validatePassword('x'.repeat(73)).ok, false);
  assert.equal(A.validatePassword('Player_One', 'player_one').ok, false);
});

test('the API address must be https (http only for localhost); anything else means "not configured"', () => {
  assert.equal(A.normalizeBase('https://a.workers.dev/'), 'https://a.workers.dev');
  assert.equal(A.normalizeBase('http://localhost:8787'), 'http://localhost:8787');
  for (const bad of ['', 'http://a.workers.dev', 'javascript:alert(1)', 'https://', 'ftp://x.y', 'https://a.dev/ x', null, 5]) assert.equal(A.normalizeBase(bad), '', String(bad));
  assert.equal(make(() => res(200, {}), { base: '' }).client.isConfigured(), false);
});

test('safeNext only allows this site (no open redirect)', () => {
  assert.equal(A.safeNext('/games/'), '/games/');
  assert.equal(A.safeNext('/grid-snake/?a=1#x'), '/grid-snake/?a=1#x');
  assert.equal(A.safeNext('https://atherbyte.online/grid-snake/'), 'https://atherbyte.online/grid-snake/');
  for (const bad of ['//evil.example', 'https://evil.example/', 'https://atherbyte.online.evil.example/', '/\\evil.example', 'javascript:alert(1)', 'data:text/html,x', '', null, '/a\nb', 'x'.repeat(600)]) assert.equal(A.safeNext(bad), '', String(bad));
});

test('register sends only what is needed, stores the session, and returns the warning', async () => {
  const { client, calls, storage } = make(() => res(201, { user: { ...USER, recovery_email_verified: false }, session: SESSION, warnings: ['no_recovery_email'] }));
  const r = await client.register('Alice_01', 'correct horse 1', 'tok-123456789');
  assert.equal(r.ok, true);
  assert.equal(r.signedIn, true);
  assert.deepEqual(r.warnings, ['no_recovery_email']);
  const sent = JSON.parse(calls[0].opts.body);
  assert.deepEqual(sent, { username: 'alice_01', password: 'correct horse 1', turnstileToken: 'tok-123456789' });
  assert.equal(calls[0].opts.credentials, 'omit', 'no cookies');
  assert.equal(calls[0].url, BASE + '/v1/auth/register');
  const stored = JSON.parse(storage.getItem(KEY));
  assert.equal(stored.user.username, 'alice_01');
  assert.ok(!JSON.stringify(stored).includes('@'), 'no email in the stored session');
  assert.equal(client.hasSession(), true);
  assert.equal(client.username(), 'alice_01');
});

test('bad input is rejected before any request is sent', async () => {
  const { client, calls } = make(() => res(500, {}));
  assert.equal((await client.register('ab', 'correct horse 1')).code, 'invalid_username');
  assert.equal((await client.register('alice_01', 'short')).code, 'invalid_password');
  assert.equal((await client.login('alice_01', '')).code, 'invalid_credentials');
  assert.equal((await client.login('!!', 'x')).code, 'invalid_username');
  assert.equal(calls.length, 0);
});

test('every server error code gets a readable message, never the raw code', async () => {
  for (const code of ['username_taken', 'weak_password', 'invalid_credentials', 'rate_limited', 'captcha_failed', 'captcha_not_configured', 'upstream_error', 'unauthorized', 'origin_not_allowed']) {
    const { client } = make(() => res(400, { error: code }));
    const r = await client.login('alice_01', 'pw-123456');
    assert.equal(r.ok, false);
    assert.equal(r.code, code);
    assert.ok(r.message && !r.message.includes('_'), code);
  }
  assert.equal(A.messageFor('something_new'), 'Something went wrong. Please try again.');
});

test('network failures and timeouts become clear messages and never throw', async () => {
  const net = make(() => { throw new Error('offline'); });
  assert.equal((await net.client.login('alice_01', 'pw-123456')).code, 'network');
  const slow = make(() => { const e = new Error('x'); e.name = 'AbortError'; throw e; });
  assert.equal((await slow.client.login('alice_01', 'pw-123456')).code, 'timeout');
  const notJson = make(() => res(502, undefined));
  assert.equal((await notJson.client.login('alice_01', 'pw-123456')).code, 'bad_response');
  const off = make(() => res(200, {}), { base: '' });
  assert.equal((await off.client.login('alice_01', 'pw-123456')).code, 'not_configured_client');
});

test('login stores the session; a wrong password stores nothing', async () => {
  const good = make(() => res(200, { user: USER, session: SESSION }));
  assert.equal((await good.client.login('ALICE_01', 'pw-123456')).ok, true);
  assert.equal(good.client.hasSession(), true);
  const bad = make(() => res(401, { error: 'invalid_credentials' }));
  const r = await bad.client.login('alice_01', 'nope-nope');
  assert.equal(r.ok, false);
  assert.equal(bad.client.hasSession(), false);
  assert.equal(bad.storage.getItem(KEY), null);
});

test('a session that is about to expire is refreshed before the call, and the new tokens are saved', async () => {
  const st = memStorage();
  const now = 1_000_000_000_000;
  st.setItem(KEY, JSON.stringify({ ...SESSION, expires_at: now / 1000 + 5, user: USER }));
  const { client, calls } = make((path, opts) => {
    if (path === '/v1/auth/refresh') return res(200, { session: { access_token: 'a2', refresh_token: 'r2', expires_at: now / 1000 + 3600 } });
    if (path === '/v1/me') return res(200, { id: USER.id, username: 'alice_01', recovery_email_verified: false });
    return res(404, {});
  }, { storage: st, now: () => now });
  const r = await client.me();
  assert.equal(r.ok, true);
  assert.deepEqual(calls.map((c) => c.url.replace(BASE, '')), ['/v1/auth/refresh', '/v1/me']);
  assert.equal(calls[1].opts.headers.Authorization, 'Bearer a2');
  assert.equal(JSON.parse(st.getItem(KEY)).refresh_token, 'r2');
  assert.equal(JSON.parse(st.getItem(KEY)).user.username, 'alice_01', 'the username survives a refresh');
});

test('a 401 triggers one refresh and one retry; if that fails the session is cleared', async () => {
  const st = memStorage();
  st.setItem(KEY, JSON.stringify({ ...SESSION, user: USER }));
  let me = 0;
  const ok = make((path) => {
    if (path === '/v1/me') return res(++me === 1 ? 401 : 200, me === 1 ? { error: 'unauthorized' } : { id: USER.id, username: 'alice_01' });
    return res(200, { session: { access_token: 'a2', refresh_token: 'r2', expires_at: 4102444800 } });
  }, { storage: st });
  assert.equal((await ok.client.me()).ok, true);

  const st2 = memStorage();
  st2.setItem(KEY, JSON.stringify({ ...SESSION, user: USER }));
  const dead = make((path) => (path === '/v1/me' ? res(401, { error: 'unauthorized' }) : res(401, { error: 'invalid_refresh' })), { storage: st2 });
  const r = await dead.client.me();
  assert.equal(r.ok, false);
  assert.equal(dead.client.hasSession(), false, 'a rejected refresh token ends the session');
});

test('a network failure during refresh does NOT sign the visitor out', async () => {
  const st = memStorage();
  st.setItem(KEY, JSON.stringify({ ...SESSION, expires_at: 1, user: USER }));
  const { client } = make((path) => { throw new Error('offline'); }, { storage: st, now: () => 1_000_000_000_000 });
  const r = await client.me();
  assert.equal(r.ok, false);
  assert.equal(client.hasSession(), true);
});

test('simultaneous refreshes share one request', async () => {
  const st = memStorage();
  st.setItem(KEY, JSON.stringify({ ...SESSION, user: USER }));
  const { client, calls } = make(async () => res(200, { session: { access_token: 'a2', refresh_token: 'r2', expires_at: 4102444800 } }), { storage: st });
  await Promise.all([client.refresh(), client.refresh(), client.refresh()]);
  assert.equal(calls.length, 1);
});

test('logout clears the session at once and asks the server to revoke it', async () => {
  const st = memStorage();
  st.setItem(KEY, JSON.stringify({ ...SESSION, user: USER }));
  const { client, calls } = make(() => res(204));
  const c2 = make(() => res(204), { storage: st });
  const r = await c2.client.logout();
  assert.equal(c2.client.hasSession(), false);
  assert.equal(r.serverRevoked, true);
  assert.equal(c2.calls[0].url, BASE + '/v1/auth/logout');
  assert.equal(c2.calls[0].opts.headers.Authorization, 'Bearer a1');
  const offline = make(() => { throw new Error('x'); }, { storage: (() => { const s = memStorage(); s.setItem(KEY, JSON.stringify({ ...SESSION, user: USER })); return s; })() });
  const r2 = await offline.client.logout();
  assert.equal(offline.client.hasSession(), false, 'signed out locally even when offline');
  assert.equal(r2.serverRevoked, false);
});

test('requireAccount: signed in passes; guest is sent to /account/ with a safe next; no service configured never locks anyone out', () => {
  const guest = make(() => res(200, {}));
  assert.equal(guest.client.requireAccount(), false);
  assert.equal(guest.loc.assigned, '/account/?next=' + encodeURIComponent('/games/'));
  const g2 = make(() => res(200, {}));
  assert.equal(g2.client.requireAccount({ next: 'https://evil.example/' }), false);
  assert.equal(g2.loc.assigned, '/account/?next=' + encodeURIComponent('/'), 'a foreign next is replaced');
  const st = memStorage();
  st.setItem(KEY, JSON.stringify({ ...SESSION, user: USER }));
  const signed = make(() => res(200, {}), { storage: st });
  assert.equal(signed.client.requireAccount(), true);
  assert.equal(signed.loc.assigned, null);
  const off = make(() => res(200, {}), { base: '' });
  assert.equal(off.client.requireAccount(), true);
  assert.equal(off.loc.assigned, null);
});

test('corrupt or incomplete stored sessions are ignored; blocked storage falls back to memory', async () => {
  for (const raw of ['not json', '{}', JSON.stringify({ access_token: 'x' }), JSON.stringify({ ...SESSION, user: {} }), 'null']) {
    const st = memStorage(); st.setItem(KEY, raw);
    assert.equal(make(() => res(200, {}), { storage: st }).client.hasSession(), false, raw);
  }
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
  const { client } = make(() => res(200, { user: USER, session: SESSION }), { storage: blocked });
  assert.equal((await client.login('alice_01', 'pw-123456')).ok, true);
  assert.equal(client.hasSession(), true, 'kept in memory for this page');
});

test('the client contains no keys or secrets', () => {
  const src = require('node:fs').readFileSync(require.resolve('../js/atherbyte-account.js'), 'utf8');
  assert.ok(!/sb_secret_|sb_publishable_|service_role|eyJ[A-Za-z0-9_-]{20,}/.test(src));
  const cfg = require('node:fs').readFileSync(require.resolve('../js/site-config.js'), 'utf8');
  assert.ok(!/sb_secret_|sb_publishable_|service_role|eyJ[A-Za-z0-9_-]{20,}/.test(cfg));
});

test('register shows a clear message when the server rejects a weak password', async () => {
  const { client } = make(() => res(400, { error: 'weak_password' }));
  const r = await client.register('alice_01', 'correct horse 1', 'tok-123456789');
  assert.equal(r.ok, false);
  assert.equal(r.code, 'weak_password');
  assert.match(r.message, /password is too easy to guess/);
});

// ---------------------------------------------------------------- site wiring guards (read the real files)
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('Account is reachable from the main navigation and footer of the home, games and account pages', () => {
  for (const f of ['index.html', 'games/index.html', 'account/index.html']) {
    const html = read(f);
    const header = (html.match(/<a class="nav-account" href="\/account\/"[^>]*data-account-link>/g) || []).length;
    const footer = (html.match(/<li><a href="\/account\/">Account<\/a><\/li>/g) || []).length;
    assert.ok(header === 1 && footer === 1, f + ' needs an Account link in both the header and the footer (found ' + header + ' and ' + footer + ')');
  }
});

test('the configured API address is https, public, and allowed by the account page CSP', () => {
  const cfg = read('js/site-config.js');
  const base = /apiBaseUrl:\s*"([^"]*)"/.exec(cfg)[1];
  assert.match(base, /^https:\/\/[a-z0-9.-]+$/, 'apiBaseUrl must be a bare https origin');
  const csp = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(read('account/index.html'))[1];
  const connect = /connect-src ([^;]+)/.exec(csp)[1].split(/\s+/);
  const host = new URL(base).host;
  const allowed = connect.some((src) => {
    if (!src.startsWith('https://')) return false;
    const h = src.slice(8);
    return h === host || (h.startsWith('*.') && host.endsWith(h.slice(1)) && host.length > h.length - 1);
  });
  assert.ok(allowed, 'CSP connect-src does not allow ' + host);
});

test('the account page CSP hash matches its inline script, and every local script/style it loads exists', () => {
  const html = read('account/index.html');
  const csp = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html)[1];
  const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  assert.ok(inline.length >= 1);
  for (const code of inline) {
    const h = "'sha256-" + crypto.createHash('sha256').update(code, 'utf8').digest('base64') + "'";
    assert.ok(csp.includes(h), 'inline script is blocked by CSP (hash mismatch)');
  }
  for (const m of html.matchAll(/(?:src|href)="(\/(?:js|css)\/[^"]+)"/g)) assert.ok(fs.existsSync(path.join(ROOT, m[1])), 'missing file ' + m[1]);
});

test('every element id that js/account-page.js looks up exists in account/index.html', () => {
  const js = read('js/account-page.js');
  const html = read('account/index.html');
  const ids = new Set([...js.matchAll(/\$\("([A-Za-z0-9_-]+)"\)/g)].map((m) => m[1]));
  assert.ok(ids.size > 10);
  for (const id of ids) assert.ok(html.includes('id="' + id + '"'), 'account-page.js uses #' + id + ' but the page has no such element');
});

test('the Turnstile key in the site config is a public site key (length guard against pasting a secret)', () => {
  const key = /turnstileSiteKey:\s*"([^"]*)"/.exec(read('js/site-config.js'))[1];
  assert.match(key, /^0x4[A-Za-z0-9_-]{15,30}$/, 'site keys are about 24 characters; secret keys are longer and must never be here');
});

// ---------------------------------------------------------------- recovery email and password reset (client)
function signedIn(handler) {
  const st = memStorage();
  st.setItem(KEY, JSON.stringify({ ...SESSION, user: USER }));
  return make(handler, { storage: st });
}

test('setEmail: validates first, sends only the lower-cased address with the user token, and returns a masked hint', async () => {
  const s = signedIn(() => res(202, { status: 'pending' }));
  assert.equal((await s.client.setEmail('nope')).code, 'invalid_email');
  assert.equal(s.calls.length, 0, 'a bad address never reaches the server');
  const r = await s.client.setEmail('  Bob@Example.com ');
  assert.deepEqual([r.ok, r.status, r.hint], [true, 'pending', 'b***@example.com']);
  assert.equal(s.calls[0].url, BASE + '/v1/me/email');
  assert.equal(s.calls[0].opts.headers.Authorization, 'Bearer a1');
  assert.deepEqual(JSON.parse(s.calls[0].opts.body), { email: 'bob@example.com' });
});

test('setEmail: needs a session, and server errors become readable messages', async () => {
  const anon = make(() => res(202, {}));
  assert.equal((await anon.client.setEmail('bob@example.com')).code, 'unauthorized');
  const limited = signedIn(() => res(429, { error: 'rate_limited' }));
  const r = await limited.client.setEmail('bob@example.com');
  assert.equal(r.ok, false);
  assert.equal(r.code, 'rate_limited');
  assert.ok(r.message && !r.message.includes('_'));
});

test('forgot: sends the identifier and captcha token without any session, and gives one neutral result', async () => {
  const s = make(() => res(202, { ok: true }));
  assert.equal((await s.client.forgot('   ')).code, 'invalid_identifier');
  const r = await s.client.forgot(' Alice_01 ', 'tok-123456789');
  assert.equal(r.ok, true);
  assert.equal(s.calls[0].url, BASE + '/v1/auth/forgot');
  assert.equal(s.calls[0].opts.headers.Authorization, undefined);
  assert.deepEqual(JSON.parse(s.calls[0].opts.body), { identifier: 'Alice_01', turnstileToken: 'tok-123456789' });
});

test('checkResetToken: valid token gives the username; refused or empty tokens give invalid_reset_link', async () => {
  const good = make((path, opts) => (opts.headers.Authorization === 'Bearer recov-token' ? res(200, { username: 'alice_01' }) : res(401, { error: 'unauthorized' })));
  assert.deepEqual(await good.client.checkResetToken('recov-token'), { ok: true, username: 'alice_01' });
  assert.equal((await good.client.checkResetToken('other')).code, 'invalid_reset_link');
  assert.equal((await good.client.checkResetToken('')).code, 'invalid_reset_link');
  assert.equal(good.storage._m.size, 0, 'the reset token is never stored');
});

test('resetPassword: applies the password rules locally, posts the token in the body, and ends the local session', async () => {
  const s = signedIn(() => res(200, { ok: true }));
  assert.equal((await s.client.resetPassword('t', 'short', 'alice_01')).code, 'invalid_password');
  assert.equal((await s.client.resetPassword('t', 'ALICE_01', 'alice_01')).code, 'invalid_password');
  assert.equal(s.calls.length, 0);
  const r = await s.client.resetPassword('recov-token', 'brand new pass 9', 'alice_01');
  assert.equal(r.ok, true);
  assert.equal(s.calls[0].url, BASE + '/v1/auth/reset');
  assert.deepEqual(JSON.parse(s.calls[0].opts.body), { access_token: 'recov-token', password: 'brand new pass 9' });
  assert.equal(s.client.hasSession(), false, 'the server signed every session out, so the local one goes too');
  const bad = signedIn(() => res(401, { error: 'invalid_reset_link' }));
  const rb = await bad.client.resetPassword('t', 'brand new pass 9', 'alice_01');
  assert.equal(rb.code, 'invalid_reset_link');
  assert.equal(bad.client.hasSession(), true, 'a failed reset does not sign anyone out');
});

test('every new server error code has a readable message', () => {
  for (const code of ['invalid_email', 'invalid_identifier', 'invalid_reset_link', 'same_password', 'weak_password']) {
    const m = A.messageFor(code);
    assert.ok(m && !m.includes('_') && m !== A.messageFor('something_new'), code);
  }
});

// ---------------------------------------------------------------- page wiring (reads the real files)
test('the reset page: files exist, CSP hash matches, API host allowed, no captcha host, and it has the ids its script uses', () => {
  const html = read('account/reset/index.html');
  const js = read('js/reset-page.js');
  const csp = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html)[1];
  for (const code of [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])) {
    assert.ok(csp.includes("'sha256-" + crypto.createHash('sha256').update(code, 'utf8').digest('base64') + "'"), 'inline script blocked by CSP');
  }
  for (const m of html.matchAll(/(?:src|href)="(\/(?:js|css)\/[^"]+)"/g)) assert.ok(fs.existsSync(path.join(ROOT, m[1])), 'missing ' + m[1]);
  assert.ok(/connect-src[^;]*https:\/\/\*\.workers\.dev/.test(csp) && /connect-src[^;]*https:\/\/api\.atherbyte\.online/.test(csp));
  assert.ok(!csp.includes('challenges.cloudflare.com'), 'the reset page does not use a captcha');
  assert.match(html, /<meta name="referrer" content="no-referrer">/);
  assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
  for (const id of new Set([...js.matchAll(/\$\("([A-Za-z0-9_-]+)"\)/g)].map((m) => m[1]))) assert.ok(html.includes('id="' + id + '"'), 'reset-page.js uses #' + id);
  assert.ok(html.indexOf('/js/atherbyte-account.js') < html.indexOf('/js/reset-page.js'), 'script order');
});

test('the account page has every control for the email flow and the forgot form, and the feature is switched on', () => {
  const html = read('account/index.html');
  for (const id of ['email-form', 'email-input', 'email-state', 'email-pending', 'email-hint', 'email-verified', 'forgot-link', 'forgot-back', 'panel-forgot', 'forgot-identifier', 'forgot-done'])
    assert.ok(html.includes('id="' + id + '"'), id);
  assert.ok(html.includes('data-captcha-for="forgot"'));
  assert.ok(!/id="email-input"[^>]*disabled/.test(html), 'the email field must not be disabled in the markup');
  assert.match(read('js/site-config.js'), /recoveryEmail:\s*true/);
});

// ---------------------------------------------------------------- profile picture
const PIC = 'https://abcdefghij.supabase.co/storage/v1/object/public/avatars/00000000-0000-4000-8000-000000000001/avatar?v=1700000000000';
const withSession = (extra) => { const s = memStorage(); s.setItem(KEY, JSON.stringify({ ...SESSION, user: USER })); return { ...(extra || {}), storage: s }; };
const blob = (type = 'image/webp', size = 5000) => ({ type, size });

test('picture address: only an address inside the avatars bucket is ever accepted', () => {
  assert.equal(A.isAvatarUrl(PIC), true);
  for (const bad of ['', null, 42, 'http://abcdefghij.supabase.co/storage/v1/object/public/avatars/00000000-0000-4000-8000-000000000001/avatar',
    'https://evil.example/storage/v1/object/public/avatars/00000000-0000-4000-8000-000000000001/avatar',
    'https://abcdefghij.supabase.co.evil.example/storage/v1/object/public/avatars/00000000-0000-4000-8000-000000000001/avatar',
    'https://abcdefghij.supabase.co/storage/v1/object/public/other/00000000-0000-4000-8000-000000000001/avatar',
    'javascript:alert(1)', PIC + '"onerror="x']) assert.equal(A.isAvatarUrl(bad), false, String(bad));
});

test('me() remembers the picture for this account; avatarUrl() reads it with no network call', async () => {
  const { client, calls } = make(() => res(200, { id: USER.id, username: 'alice_01', avatar_url: PIC }), withSession());
  assert.equal(client.avatarUrl(), '');
  await client.me();
  assert.equal(client.avatarUrl(), PIC);
  const n = calls.length;
  assert.equal(client.avatarUrl(), PIC);
  assert.equal(calls.length, n);
});

test('a picture address that is not in the avatars bucket is ignored even if the server sends it', async () => {
  const { client } = make(() => res(200, { id: USER.id, username: 'alice_01', avatar_url: 'https://evil.example/x.png' }), withSession());
  await client.me();
  assert.equal(client.avatarUrl(), '');
});

test('the remembered picture belongs to one account and disappears on sign out', async () => {
  const { client, storage } = make((p) => (p === '/v1/auth/logout' ? res(204) : res(200, { id: USER.id, username: 'alice_01', avatar_url: PIC })), withSession());
  await client.me();
  assert.equal(client.avatarUrl(), PIC);
  storage.setItem(KEY, JSON.stringify({ ...SESSION, user: { id: '00000000-0000-4000-8000-000000000002', username: 'bob_01' } }));
  assert.equal(client.avatarUrl(), '', 'another account never sees it');
  storage.setItem(KEY, JSON.stringify({ ...SESSION, user: USER }));
  assert.equal(client.avatarUrl(), PIC);
  await client.logout();
  assert.equal(client.avatarUrl(), '');
  assert.equal(storage.getItem(A.AVATAR_KEY), null);
});

test('uploadAvatar sends the picture itself (not JSON) with the token, and remembers the new address', async () => {
  const { client, calls } = make(() => res(200, { avatar_url: PIC }), withSession());
  const b = blob();
  const r = await client.uploadAvatar(b);
  assert.equal(r.ok, true);
  assert.equal(r.avatarUrl, PIC);
  assert.equal(calls[0].url, BASE + '/v1/me/avatar');
  assert.equal(calls[0].opts.method, 'POST');
  assert.equal(calls[0].opts.body, b);
  assert.equal(calls[0].opts.headers['Content-Type'], 'image/webp');
  assert.equal(calls[0].opts.headers.Authorization, 'Bearer a1');
  assert.equal(calls[0].opts.credentials, 'omit');
  assert.equal(client.avatarUrl(), PIC);
});

test('uploadAvatar refuses the wrong type, an empty or a too-big file before any request', async () => {
  const { client, calls } = make(() => res(200, { avatar_url: PIC }), withSession());
  assert.equal((await client.uploadAvatar(blob('image/svg+xml'))).code, 'invalid_image');
  assert.equal((await client.uploadAvatar(blob('image/gif'))).code, 'invalid_image');
  assert.equal((await client.uploadAvatar(blob('image/png', 0))).code, 'invalid_image');
  assert.equal((await client.uploadAvatar(blob('image/png', A.AVATAR_MAX_BYTES + 1))).code, 'image_too_large');
  assert.equal((await client.uploadAvatar(null)).code, 'invalid_image');
  assert.equal(calls.length, 0);
});

test('uploadAvatar shows the server answer: an unverified account is told why, and nothing is remembered', async () => {
  const { client } = make(() => res(403, { error: 'email_not_verified' }), withSession());
  const r = await client.uploadAvatar(blob());
  assert.equal(r.ok, false);
  assert.equal(r.code, 'email_not_verified');
  assert.match(r.message, /verify a recovery email/);
  assert.equal(client.avatarUrl(), '');
});

test('uploadAvatar does not trust an odd address in the answer', async () => {
  const { client } = make(() => res(200, { avatar_url: 'https://evil.example/a.png' }), withSession());
  assert.equal((await client.uploadAvatar(blob())).ok, false);
  assert.equal(client.avatarUrl(), '');
});

test('uploadAvatar needs a signed-in account', async () => {
  const { client, calls } = make(() => res(200, { avatar_url: PIC }));
  const r = await client.uploadAvatar(blob());
  assert.equal(r.ok, false);
  assert.equal(r.code, 'unauthorized');
  assert.equal(calls.length, 0);
});

test('removeAvatar calls the server and forgets the picture', async () => {
  const { client, calls } = make((p) => (p === '/v1/me' ? res(200, { id: USER.id, username: 'alice_01', avatar_url: PIC }) : res(200, { avatar_url: null })), withSession());
  await client.me();
  assert.equal(client.avatarUrl(), PIC);
  const r = await client.removeAvatar();
  assert.equal(r.ok, true);
  assert.equal(calls[1].url, BASE + '/v1/me/avatar/remove');
  assert.equal(client.avatarUrl(), '');
});

test('refreshAvatar asks the server at most once an hour', async () => {
  let t = 1000000;
  const { client, calls } = make(() => res(200, { id: USER.id, username: 'alice_01', avatar_url: PIC }), withSession({ now: () => t }));
  assert.equal(await client.refreshAvatar(false), PIC);
  assert.equal(calls.length, 1);
  assert.equal(await client.refreshAvatar(false), PIC);
  assert.equal(calls.length, 1, 'fresh enough: no request');
  t += 61 * 60 * 1000;
  await client.refreshAvatar(false);
  assert.equal(calls.length, 2);
  await client.refreshAvatar(true);
  assert.equal(calls.length, 3);
});

test('refreshAvatar keeps what is shown when the network is down', async () => {
  const { client } = make(() => { throw new Error('offline'); }, withSession());
  assert.equal(await client.refreshAvatar(true), '');
});

test('the account page can show the picture: its policy allows the avatars host, and the editor controls exist', () => {
  const html = read('account/index.html');
  const csp = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html)[1];
  const img = /img-src ([^;]+);/.exec(csp)[1];
  assert.ok(/https:\/\/\*\.supabase\.co/.test(img) && /blob:/.test(img) && /'self'/.test(img));
  assert.ok(!/unsafe-inline|unsafe-eval/.test(csp));
  assert.ok(!/script-src[^;]*supabase/.test(csp), 'no script may come from the storage host');
  for (const id of ['avatar-editor', 'avatar-file', 'avatar-save', 'avatar-remove', 'avatar-img', 'avatar-error', 'avatar-status']) assert.ok(html.includes('id="' + id + '"'), id);
});

test('the picture feature is switched on in the site settings (the Worker side is deployed)', () => {
  assert.match(read('js/site-config.js'), /avatarUpload:\s*true/);
});
