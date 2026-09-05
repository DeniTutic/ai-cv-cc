const test = require('node:test');
const assert = require('node:assert/strict');
require('./helpers');

const request = require('supertest');
const mongoose = require('mongoose');

function loadHandler({ mongoUri = 'mongodb://stub/db', connectImpl } = {}) {
  const original = mongoose.connect;
  let calls = 0;

  mongoose.connect = async (...args) => {
    calls += 1;
    if (connectImpl) return connectImpl(...args);
    return mongoose;
  };

  process.env.MONGO_URI = mongoUri;
  delete globalThis.__cvlensMongo;
  delete require.cache[require.resolve('../api/index')];
  delete require.cache[require.resolve('../app')];

  const handler = require('../api/index');
  return { handler, connectCalls: () => calls, restore: () => { mongoose.connect = original; } };
}

test.after(() => {
  delete globalThis.__cvlensMongo;
  delete process.env.MONGO_URI;
});

test('exports a request handler Vercel can invoke', () => {
  const { handler, restore } = loadHandler();
  assert.equal(typeof handler, 'function');
  assert.equal(typeof handler.connectToDatabase, 'function');
  restore();
});

// The health check sits ahead of the connection gate on purpose, so a platform
// probe stays green during a database blip.
test('the health check answers without touching the database', async () => {
  const { handler, connectCalls, restore } = loadHandler({
    connectImpl: async () => { throw new Error('database is down'); }
  });

  const res = await request(handler).get('/api/health');

  assert.equal(res.status, 200);
  assert.equal(connectCalls(), 0, 'a health probe must not cost a connection');
  restore();
});

test('an unknown path 404s without opening a database connection', async () => {
  const { handler, connectCalls, restore } = loadHandler({
    connectImpl: async () => { throw new Error('database is down'); }
  });

  const res = await request(handler).get('/api/nope');

  assert.equal(res.status, 404, 'a missing route is not a database problem');
  assert.equal(res.body.error, 'Not found.');
  assert.equal(connectCalls(), 0, 'a stray path or bot scan must not cost a connection');
  restore();
});

test('reuses one connection across invocations instead of dialling per request', async () => {
  const { handler, connectCalls, restore } = loadHandler();

  for (let i = 0; i < 3; i += 1) {
    const res = await request(handler).get('/api/cv/history');
    assert.equal(res.status, 401, 'unauthenticated, but past the connection gate');
  }

  assert.equal(connectCalls(), 1, 'a warm instance must not reconnect');
  restore();
});

test('concurrent cold requests await one in-flight connection', async () => {
  let resolveConnect;
  const gate = new Promise((resolve) => { resolveConnect = resolve; });

  const { handler, connectCalls, restore } = loadHandler({
    connectImpl: async () => { await gate; return mongoose; }
  });

  const inFlight = [1, 2, 3, 4].map(() => request(handler).get('/api/cv/history'));
  resolveConnect();
  const results = await Promise.all(inFlight);

  assert.ok(results.every((r) => r.status === 401));
  assert.equal(connectCalls(), 1, 'four simultaneous cold requests must share one dial-out');
  restore();
});

// Regression: app.use() called after createApp() registers middleware AFTER the
// routes, so handlers would run against an unconnected Mongoose. The connection
// hook must be passed as beforeRoutes.
test('the connection runs before any route handler, not after', async () => {
  const order = [];
  const { handler, restore } = loadHandler({
    connectImpl: async () => { order.push('connect'); return mongoose; }
  });

  const res = await request(handler).get('/api/cv/history');
  order.push('route');

  assert.equal(res.status, 401);
  assert.deepEqual(order, ['connect', 'route']);
  restore();
});

test('a failed connection returns 503, not a hang or a stack trace', async () => {
  const { handler, restore } = loadHandler({
    connectImpl: async () => { throw new Error('bad auth'); }
  });

  const res = await request(handler).get('/api/cv/history');

  assert.equal(res.status, 503);
  assert.match(res.body.error, /temporarily unavailable/i);
  assert.doesNotMatch(JSON.stringify(res.body), /bad auth/, 'must not leak the driver error');
  restore();
});

test('a failed connection is retried rather than cached forever', async () => {
  let attempt = 0;
  const { handler, connectCalls, restore } = loadHandler({
    connectImpl: async () => {
      attempt += 1;
      if (attempt === 1) throw new Error('transient');
      return mongoose;
    }
  });

  const first = await request(handler).get('/api/cv/history');
  assert.equal(first.status, 503);

  const second = await request(handler).get('/api/cv/history');
  assert.equal(second.status, 401, 'the next request must retry the connection and get through');
  assert.equal(connectCalls(), 2);
  restore();
});
