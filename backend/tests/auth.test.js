const test = require('node:test');
const assert = require('node:assert/strict');
require('./helpers');

const request = require('supertest');
const { createApp } = require('../app');

const app = createApp({ rateLimit: false });

test('health check is public', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
});

test('unknown routes return JSON, not an HTML error page', async () => {
  const res = await request(app).get('/api/does-not-exist');
  assert.equal(res.status, 404);
  assert.deepEqual(res.body, { error: 'Not found.' });
});

// The regression this suite exists for: with auth misconfigured, an undefined
// auth0Id used to be stripped from the Mongoose filter, widening
// find({auth0Id}) to find({}) and returning every user's analyses.
const PROTECTED = [
  ['get', '/api/cv/history'],
  ['get', '/api/cv/stats'],
  ['get', '/api/cv/507f1f77bcf86cd799439011'],
  ['delete', '/api/cv/507f1f77bcf86cd799439011'],
  ['post', '/api/cv/upload'],
  ['get', '/api/user/me']
];

for (const [method, route] of PROTECTED) {
  test(`${method.toUpperCase()} ${route} rejects an anonymous caller`, async () => {
    const res = await request(app)[method](route);
    assert.equal(res.status, 401, `expected 401, got ${res.status}`);
    assert.ok(!Array.isArray(res.body.analyses), 'must never return a list of analyses');
  });

  test(`${method.toUpperCase()} ${route} rejects a malformed token`, async () => {
    const res = await request(app)[method](route).set('Authorization', 'Bearer not.a.real.jwt');
    assert.equal(res.status, 401);
  });
}

test('a forged unsigned JWT with a valid-looking sub is rejected', async () => {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const forged = [
    b64({ alg: 'none', typ: 'JWT' }),
    b64({ sub: 'auth0|attacker', aud: process.env.AUTH0_AUDIENCE }),
    ''
  ].join('.');

  const res = await request(app).get('/api/cv/history').set('Authorization', `Bearer ${forged}`);
  assert.equal(res.status, 401);
  assert.ok(!res.body.analyses);
});
