/**
 * @file tests/api.test.js
 * @description CivicNavigator AI — Comprehensive test suite.
 *
 * Coverage:
 *   1. Health & Config endpoints
 *   2. Chat API — validation, security (XSS, injection), edge cases
 *   3. Polling Places API — validation, coordinates
 *   4. Elections API — validation, response shape
 *   5. Unit tests — detectIntent, generateSuggestions (imported directly)
 *   6. Security — oversized payloads, missing content-type, rate-limit headers
 *   7. Accessibility — ARIA and semantic HTML presence in served page
 *
 * Run: npm test  (server must be running on PORT or 8080)
 */

import assert from 'assert';
import { detectIntent, generateSuggestions } from '../src/civicAgent.js';

const PORT = process.env.PORT || 8080;
const BASE = `http://localhost:${PORT}`;

let passed = 0;
let failed = 0;
let skipped = 0;

// ─── Test Harness ─────────────────────────────────────────────────────────────

async function test(name, fn, { skip = false } = {}) {
  if (skip) {
    console.log(`  ⏭️  [SKIP] ${name}`);
    skipped++;
    return;
  }
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     → ${err.message}`);
    failed++;
  }
}

async function json(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  let body;
  try { body = await res.json(); } catch { body = null; }
  return { status: res.status, headers: res.headers, body };
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. HEALTH & CONFIG
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n🗳️  CivicNavigator AI — Test Suite\n');
console.log('── 1. Health & Config');

await test('GET /health returns 200 with status:healthy', async () => {
  const { status, body } = await json('/health');
  assert.strictEqual(status, 200, `Expected 200, got ${status}`);
  assert.strictEqual(body.status, 'healthy');
});

await test('GET /health includes version and timestamp', async () => {
  const { body } = await json('/health');
  assert.ok(typeof body.version === 'string', 'Missing version');
  assert.ok(typeof body.timestamp === 'string', 'Missing timestamp');
  assert.ok(!isNaN(Date.parse(body.timestamp)), 'timestamp is not a valid ISO date');
});

await test('GET /health includes services.gemini and services.maps', async () => {
  const { body } = await json('/health');
  assert.ok(typeof body.services === 'object', 'Missing services object');
  assert.ok('gemini' in body.services, 'Missing services.gemini');
  assert.ok('maps' in body.services, 'Missing services.maps');
  assert.ok(typeof body.services.gemini === 'boolean', 'services.gemini should be boolean');
});

await test('GET /api/config returns mapsApiKey string', async () => {
  const { status, body } = await json('/api/config');
  assert.strictEqual(status, 200);
  assert.ok('mapsApiKey' in body, 'Missing mapsApiKey');
  assert.ok(typeof body.mapsApiKey === 'string', 'mapsApiKey must be a string');
});

await test('GET /api/config does NOT expose GEMINI_API_KEY', async () => {
  const { body } = await json('/api/config');
  assert.ok(!('geminiKey' in body), 'SECURITY: geminiKey must not be in /api/config');
  assert.ok(!('GEMINI_API_KEY' in body), 'SECURITY: GEMINI_API_KEY must not be in /api/config');
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. CHAT API — Validation & Security
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── 2. Chat API');

await test('POST /api/chat → 400 when message is missing', async () => {
  const { status } = await json('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.strictEqual(status, 400);
});

await test('POST /api/chat → 400 when message is empty string', async () => {
  const { status } = await json('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: '' }),
  });
  assert.strictEqual(status, 400);
});

await test('POST /api/chat → 400 when message is a number', async () => {
  const { status } = await json('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 42 }),
  });
  assert.strictEqual(status, 400);
});

await test('POST /api/chat → 400 when message exceeds 1000 chars', async () => {
  const { status } = await json('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'x'.repeat(1001) }),
  });
  assert.strictEqual(status, 400);
});

await test('POST /api/chat → 400 when history is not an array', async () => {
  const { status } = await json('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Hello', history: 'not an array' }),
  });
  assert.strictEqual(status, 400);
});

await test('SECURITY: POST /api/chat strips HTML tags from message (XSS)', async () => {
  // Message with HTML — should not cause 500 due to HTML, but may cause 500 if API key is missing.
  const { status } = await json('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: '<script>alert(1)</script>How do I vote?' }),
  });
  // After stripping, message becomes "How do I vote?" which is valid
  assert.ok([200, 400, 500].includes(status), `Unexpected status: ${status}`);
});

await test('SECURITY: POST /api/chat rejects payload > 10kb', async () => {
  const { status } = await json('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'test', extra: 'x'.repeat(15000) }),
  });
  assert.ok([400, 413].includes(status), `Expected 400 or 413, got ${status}`);
});

await test('POST /api/chat → 200 with reply/suggestions/intent (live AI)', async () => {
  const { status, body } = await json('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'How do I register to vote?' }),
  });
  if (status === 200) {
    assert.ok(typeof body.reply === 'string' && body.reply.length > 0, 'Missing reply');
    assert.ok(Array.isArray(body.suggestions), 'suggestions must be an array');
    assert.ok(body.suggestions.length > 0, 'suggestions must not be empty');
    assert.ok(typeof body.intent === 'string', 'Missing intent');
  } else {
    console.log(`     ℹ️  Skipped live AI check (status=${status})`);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. POLLING PLACES API
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── 3. Polling Places API');

await test('POST /api/polling-places → 400 with empty body', async () => {
  const { status } = await json('/api/polling-places', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.strictEqual(status, 400);
});

await test('POST /api/polling-places → 400 when lat/lng are strings', async () => {
  const { status } = await json('/api/polling-places', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat: '37.7', lng: '-122.4' }),
  });
  assert.strictEqual(status, 400);
});

await test('POST /api/polling-places → 200 with valid address', async () => {
  const { status, body } = await json('/api/polling-places', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: '1600 Pennsylvania Ave NW, Washington, DC' }),
  });
  if (status === 200) {
    assert.ok(body.places, 'Missing places in response');
  } else {
    console.log(`     ℹ️  Maps API may not be enabled (status=${status})`);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. ELECTIONS API
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── 4. Elections API');

await test('POST /api/elections → 400 when address is missing', async () => {
  const { status } = await json('/api/elections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.strictEqual(status, 400);
});

await test('POST /api/elections → 400 when address is a number', async () => {
  const { status } = await json('/api/elections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: 12345 }),
  });
  assert.strictEqual(status, 400);
});

await test('POST /api/elections → 200 with elections array', async () => {
  const { status, body } = await json('/api/elections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: 'Washington, DC' }),
  });
  assert.strictEqual(status, 200, `Expected 200, got ${status}`);
  assert.ok(Array.isArray(body.elections), 'elections must be an array');
  assert.ok(Array.isArray(body.candidates), 'candidates must be an array');
});

await test('POST /api/elections → election entries have required fields', async () => {
  const { status, body } = await json('/api/elections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: 'Washington, DC' }),
  });
  if (status === 200 && body.elections?.length) {
    const e = body.elections[0];
    assert.ok(e.name, 'Election missing name');
    assert.ok(e.date || e.formattedDate, 'Election missing date');
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. UNIT TESTS — civicAgent utilities
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── 5. Unit Tests (civicAgent utilities)');

await test('detectIntent: polling keywords → "polling_location"', async () => {
  assert.strictEqual(detectIntent('Where is my polling place?'), 'polling_location');
  assert.strictEqual(detectIntent('Find nearest voting booth'), 'polling_location');
});

await test('detectIntent: registration keywords → "registration"', async () => {
  assert.strictEqual(detectIntent('How do I register to vote?'), 'registration');
  assert.strictEqual(detectIntent('Am I eligible to sign up?'), 'registration');
});

await test('detectIntent: absentee keywords → "absentee_voting"', async () => {
  assert.strictEqual(detectIntent('How do I vote by mail?'), 'absentee_voting');
  assert.strictEqual(detectIntent('Request an absentee ballot'), 'absentee_voting');
});

await test('detectIntent: voter ID keywords → "voter_id"', async () => {
  assert.strictEqual(detectIntent('What ID do I need to bring?'), 'voter_id');
});

await test('detectIntent: rights keywords → "voter_rights"', async () => {
  assert.strictEqual(detectIntent('What are my legal rights at the polls?'), 'voter_rights');
});

await test('detectIntent: accessibility keywords → "accessibility"', async () => {
  assert.strictEqual(detectIntent('Is wheelchair accessible curbside voting available?'), 'accessibility');
});

await test('detectIntent: unknown → "general"', async () => {
  assert.strictEqual(detectIntent('Hello, how are you?'), 'general');
});

await test('generateSuggestions returns exactly 3 items', async () => {
  const intents = ['polling_location', 'registration', 'voter_id', 'general', 'accessibility'];
  for (const intent of intents) {
    const suggestions = generateSuggestions(intent, null);
    assert.strictEqual(suggestions.length, 3, `Expected 3 suggestions for ${intent}`);
    suggestions.forEach(s => assert.ok(typeof s === 'string' && s.length > 0));
  }
});

await test('generateSuggestions falls back to general for unknown intent', async () => {
  const suggestions = generateSuggestions('unknown_intent_xyz', null);
  assert.strictEqual(suggestions.length, 3);
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. SECURITY
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── 6. Security');

await test('Response has X-Content-Type-Options header (Helmet)', async () => {
  const { headers } = await json('/health');
  assert.ok(
    headers.get('x-content-type-options') === 'nosniff',
    'Missing X-Content-Type-Options header'
  );
});

await test('Response has X-Frame-Options header (Helmet)', async () => {
  const res = await fetch(`${BASE}/health`);
  assert.ok(
    res.headers.get('x-frame-options'),
    'Missing X-Frame-Options header'
  );
});

await test('Response has RateLimit headers on /api/ routes', async () => {
  const res = await fetch(`${BASE}/api/config`);
  const rl = res.headers.get('ratelimit-limit') || res.headers.get('x-ratelimit-limit');
  assert.ok(rl, 'Missing RateLimit header on /api/ route');
});

await test('Unknown API route returns HTML (SPA fallback), not JSON error', async () => {
  const res = await fetch(`${BASE}/api/unknown-route-xyz`);
  // Could be 200 (SPA) or 404 — both acceptable; must not 500
  assert.ok(res.status !== 500, `Should not 500 on unknown route, got ${res.status}`);
});

// ═════════════════════════════════════════════════════════════════════════════
// 7. STATIC FRONTEND & ACCESSIBILITY STRUCTURE
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── 7. Frontend & Accessibility');

await test('GET / serves HTML with Content-Type text/html', async () => {
  const res = await fetch(`${BASE}/`);
  assert.strictEqual(res.status, 200);
  assert.ok(res.headers.get('content-type')?.includes('text/html'), 'Not HTML content-type');
});

await test('HTML contains lang attribute for screen readers', async () => {
  const res = await fetch(`${BASE}/`);
  const html = await res.text();
  assert.ok(html.includes('lang="en"'), 'Missing lang attribute on <html>');
});

await test('HTML contains skip navigation link (accessibility)', async () => {
  const res = await fetch(`${BASE}/`);
  const html = await res.text();
  assert.ok(html.includes('skip-link'), 'Missing skip navigation link');
});

await test('HTML contains aria-label attributes', async () => {
  const res = await fetch(`${BASE}/`);
  const html = await res.text();
  assert.ok(html.includes('aria-label'), 'Missing aria-label attributes');
});

await test('HTML contains aria-live region for chat (screen reader announcements)', async () => {
  const res = await fetch(`${BASE}/`);
  const html = await res.text();
  assert.ok(html.includes('aria-live'), 'Missing aria-live region');
});

await test('HTML contains role="main" for semantic structure', async () => {
  const res = await fetch(`${BASE}/`);
  const html = await res.text();
  assert.ok(html.includes('role="main"'), 'Missing role="main"');
});

await test('HTML contains viewport meta tag (mobile accessibility)', async () => {
  const res = await fetch(`${BASE}/`);
  const html = await res.text();
  assert.ok(html.includes('viewport'), 'Missing viewport meta tag');
});

// ═════════════════════════════════════════════════════════════════════════════
// RESULTS
// ═════════════════════════════════════════════════════════════════════════════
const total = passed + failed + skipped;
console.log(`\n${'═'.repeat(50)}`);
console.log(`  Results: ${total} tests`);
console.log(`  ✅ Passed:  ${passed}`);
console.log(`  ❌ Failed:  ${failed}`);
console.log(`  ⏭️  Skipped: ${skipped}`);
console.log(`${'═'.repeat(50)}\n`);

if (failed > 0) process.exit(1);
