const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { MONGO_TEST_URI, mongoAvailable } = require('./helpers');

test('DB-backed route tests', async (t) => {
  if (!(await mongoAvailable())) {
    t.skip('no mongod reachable — start one or set MONGO_TEST_URI');
    return;
  }

  // Stub the auth middleware before routes/cv.js requires it, so we can drive
  // the routes as a chosen user without minting real Auth0 tokens.
  let currentUser = 'auth0|alice';
  const authPath = require.resolve('../middleware/auth');

  const stub = (req, res, next) => {
    req.auth = { payload: { sub: currentUser, email: `${currentUser}@example.com`, name: currentUser } };
    next();
  };
  stub.checkJwt = stub;
  stub.requireUser = (req, res, next) => {
    const sub = req.auth?.payload?.sub;
    if (typeof sub !== 'string' || !sub) return res.status(401).json({ error: 'Unauthorized.' });
    req.auth0Id = sub;
    next();
  };
  require.cache[authPath] = { id: authPath, filename: authPath, loaded: true, exports: stub };

  const mongoose = require('mongoose');
  const request = require('supertest');
  const { createApp } = require('../app');
  const CVAnalysis = require('../models/CVAnalysis');

  await mongoose.connect(MONGO_TEST_URI);
  await mongoose.connection.db.dropDatabase();

  const app = createApp({ rateLimit: false });

  t.after(async () => {
    await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
  });

  const make = (auth0Id, overrides = {}) =>
    CVAnalysis.create({
      auth0Id,
      originalFileName: 'cv.pdf',
      fileType: 'pdf',
      overallScore: 60,
      atsScore: 50,
      status: 'completed',
      ...overrides
    });

  await t.test('history returns only the caller\'s own analyses', async () => {
    await make('auth0|alice', { originalFileName: 'alice.pdf' });
    await make('auth0|bob', { originalFileName: 'bob.pdf' });

    currentUser = 'auth0|alice';
    const res = await request(app).get('/api/cv/history');

    assert.equal(res.status, 200);
    assert.equal(res.body.analyses.length, 1);
    assert.equal(res.body.analyses[0].originalFileName, 'alice.pdf');
  });

  await t.test('history never leaks the stored CV text', async () => {
    currentUser = 'auth0|alice';
    const res = await request(app).get('/api/cv/history');
    assert.equal(res.body.analyses[0].extractedText, undefined);
  });

  await t.test('one user cannot read another user\'s analysis by id', async () => {
    const bobDoc = await make('auth0|bob', { originalFileName: 'bob-secret.pdf' });

    currentUser = 'auth0|alice';
    const res = await request(app).get(`/api/cv/${bobDoc._id}`);

    assert.equal(res.status, 404);
    assert.equal(res.body.analysis, undefined);
  });

  await t.test('one user cannot delete another user\'s analysis', async () => {
    const bobDoc = await make('auth0|bob');

    currentUser = 'auth0|alice';
    const res = await request(app).delete(`/api/cv/${bobDoc._id}`);

    assert.equal(res.status, 404);
    assert.ok(await CVAnalysis.findById(bobDoc._id), 'the document must still exist');
  });

  await t.test('a non-ObjectId id returns 404, not a 500 CastError', async () => {
    currentUser = 'auth0|alice';
    const res = await request(app).get('/api/cv/not-a-real-id');
    assert.equal(res.status, 404);
    assert.equal(res.body.error, 'Analysis not found.');
  });

  await t.test('stats reports the newest score as latest, not Mongo natural order', async () => {
    await mongoose.connection.db.dropDatabase();

    // Inserted oldest-first, so an unsorted find() returns 40 first.
    await make('auth0|carol', { overallScore: 40, createdAt: new Date('2026-01-01') });
    await make('auth0|carol', { overallScore: 85, createdAt: new Date('2026-02-01') });
    await make('auth0|carol', { overallScore: 70, createdAt: new Date('2026-03-01') });

    currentUser = 'auth0|carol';
    const res = await request(app).get('/api/cv/stats');

    assert.equal(res.body.total, 3);
    assert.equal(res.body.bestScore, 85);
    assert.equal(res.body.latestScore, 70, 'latest must be the most recent by createdAt');
    assert.equal(res.body.previousScore, 85);
  });

  await t.test('the scoreLabel virtual is serialized to the client', async () => {
    currentUser = 'auth0|carol';
    const res = await request(app).get('/api/cv/stats');
    assert.equal(res.status, 200);

    const doc = await make('auth0|carol', { overallScore: 90 });
    const detail = await request(app).get(`/api/cv/${doc._id}`);
    assert.equal(detail.body.analysis.scoreLabel, 'Excellent');
  });
});
