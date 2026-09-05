const test = require('node:test');
const assert = require('node:assert/strict');
require('./helpers');

const request = require('supertest');

function appWith(env) {
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  delete require.cache[require.resolve('../app')];
  return require('../app').createApp({ rateLimit: false });
}

const origin = (res) => res.headers['access-control-allow-origin'];

test.after(() => {
  delete process.env.FRONTEND_URL;
  delete process.env.VERCEL_PREVIEW_SUFFIX;
});

test('defaults to the local dev origin', async () => {
  const app = appWith({ FRONTEND_URL: undefined, VERCEL_PREVIEW_SUFFIX: undefined });
  const res = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');
  assert.equal(origin(res), 'http://localhost:5173');
});

test('rejects an origin that is not allowed', async () => {
  const app = appWith({ FRONTEND_URL: 'https://cvlens.vercel.app' });
  const res = await request(app).get('/api/health').set('Origin', 'https://evil.example.com');
  assert.equal(origin(res), undefined);
});

// A Vercel project serves several origins at once, so a single value is not enough.
test('accepts any origin in the comma-separated list', async () => {
  const app = appWith({ FRONTEND_URL: 'https://cvlens.vercel.app, http://localhost:5173' });

  for (const o of ['https://cvlens.vercel.app', 'http://localhost:5173']) {
    const res = await request(app).get('/api/health').set('Origin', o);
    assert.equal(origin(res), o);
  }
});

test('accepts Vercel preview deployments by suffix', async () => {
  const app = appWith({
    FRONTEND_URL: 'https://cvlens.vercel.app',
    VERCEL_PREVIEW_SUFFIX: '.vercel.app'
  });

  const preview = 'https://cvlens-git-feature-denitutic.vercel.app';
  const res = await request(app).get('/api/health').set('Origin', preview);
  assert.equal(origin(res), preview);
});

test('a request with no Origin header still works (curl, health checks)', async () => {
  const app = appWith({ FRONTEND_URL: 'https://cvlens.vercel.app' });
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
});
