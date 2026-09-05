const test = require('node:test');
const assert = require('node:assert/strict');

const request = require('supertest');

/**
 * Loads the app with Auth0 deliberately unconfigured. Vercel sets
 * NODE_ENV=production automatically, so this is exactly the state a deploy is in
 * before its environment variables are filled in.
 */
function loadUnconfigured() {
  const saved = { ...process.env };
  delete process.env.AUTH0_DOMAIN;
  delete process.env.AUTH0_AUDIENCE;
  process.env.NODE_ENV = 'production';

  for (const key of ['../middleware/auth', '../routes/cv', '../routes/user', '../app']) {
    delete require.cache[require.resolve(key)];
  }

  const app = require('../app').createApp({ rateLimit: false });
  return { app, restore: () => { process.env = saved; } };
}

// Regression: auth.js used to throw at import when unconfigured. On serverless
// that kills the function, so every route returned an opaque platform 500 and
// the health check could not report anything at all.
test('importing the app without Auth0 config does not throw', () => {
  const { restore } = loadUnconfigured();
  restore();
});

test('the health check still answers when Auth0 is unconfigured', async () => {
  const { app, restore } = loadUnconfigured();

  const res = await request(app).get('/api/health');

  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
  restore();
});

test('protected routes refuse cleanly with 503, never with data', async () => {
  const { app, restore } = loadUnconfigured();

  for (const route of ['/api/cv/history', '/api/cv/stats', '/api/user/me']) {
    const res = await request(app).get(route);

    assert.equal(res.status, 503, `${route} must refuse`);
    assert.equal(res.body.analyses, undefined, `${route} must never return data`);
    assert.match(res.body.error, /not configured/i);
  }

  restore();
});

test('a bearer token cannot get past an unconfigured server', async () => {
  const { app, restore } = loadUnconfigured();

  const res = await request(app)
    .get('/api/cv/history')
    .set('Authorization', 'Bearer anything.at.all');

  assert.equal(res.status, 503);
  assert.equal(res.body.analyses, undefined);
  restore();
});

test('the refusal does not leak the tenant or audience', async () => {
  const { app, restore } = loadUnconfigured();

  const res = await request(app).get('/api/cv/history');
  const body = JSON.stringify(res.body);

  assert.doesNotMatch(body, /auth0\.com/);
  assert.doesNotMatch(body, /SETUP\.md/, 'operator guidance belongs in logs, not the response');
  restore();
});
