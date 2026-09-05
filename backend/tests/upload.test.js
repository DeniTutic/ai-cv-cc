const test = require('node:test');
const assert = require('node:assert/strict');
require('./helpers');

const express = require('express');
const multer = require('multer');
const request = require('supertest');
const upload = require('../middleware/upload');

const MB = 1024 * 1024;

// Mirrors the error mapping in app.js, so the filter and limits can be exercised
// without a token.
const app = express();
app.post('/u', upload.single('cv'), (req, res) =>
  res.json({ ok: true, bytes: req.file.buffer.length, hasPath: Boolean(req.file.path) })
);
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File is too large. Maximum size is 4 MB.' });
    return res.status(400).json({ error: 'Upload rejected. Send a single file in the "cv" field.' });
  }
  res.status(500).json({ error: 'unexpected' });
});

const send = (buffer, name, contentType) =>
  request(app).post('/u').attach('cv', buffer, { filename: name, contentType });

test('the cap sits below Vercel\'s 4.5 MB request body limit', () => {
  assert.equal(upload.MAX_BYTES, 4 * MB);
  assert.ok(upload.MAX_BYTES < 4.5 * MB, 'must leave headroom for multipart overhead');
});

test('accepts a txt whose extension and mimetype agree', async () => {
  const res = await send(Buffer.from('hello'), 'cv.txt', 'text/plain');
  assert.equal(res.status, 200);
});

// Files are held in memory now; nothing may touch the read-only serverless disk.
test('the file arrives as a buffer with no path on disk', async () => {
  const res = await send(Buffer.from('hello world'), 'cv.txt', 'text/plain');
  assert.equal(res.body.bytes, 11);
  assert.equal(res.body.hasPath, false);
});

test('accepts a file just under the cap', async () => {
  const res = await send(Buffer.alloc(4 * MB - 1024), 'cv.pdf', 'application/pdf');
  assert.equal(res.status, 200);
});

test('rejects a file just over the cap with 413, not 500', async () => {
  const res = await send(Buffer.alloc(4 * MB + 1), 'big.pdf', 'application/pdf');
  assert.equal(res.status, 413);
  assert.match(res.body.error, /4 MB/);
});

// The filter used to be an OR, so either signal alone let a file through.
test('rejects when extension and mimetype disagree', async () => {
  const res = await send(Buffer.from('x'), 'a.txt', 'application/pdf');
  assert.equal(res.status, 400);
});

test('rejects legacy .doc, which mammoth cannot read', async () => {
  const res = await send(Buffer.from('x'), 'old.doc', 'application/msword');
  assert.equal(res.status, 400);
});

test('rejects an executable extension outright', async () => {
  const res = await send(Buffer.from('x'), 'evil.js', 'text/plain');
  assert.equal(res.status, 400);
});
