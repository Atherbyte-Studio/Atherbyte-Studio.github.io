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
    const hits = (html.match(/<li><a href="\/account\/"[^>]*>Account<\/a><\/li>/g) || []).length;
    assert.ok(hits >= 2, f + ' needs an Account link in both the header nav and the footer (found ' + hits + ')');
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
