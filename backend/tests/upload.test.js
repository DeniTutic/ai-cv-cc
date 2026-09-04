const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
require('./helpers');

const express = require('express');
const multer = require('multer');
const request = require('supertest');
const upload = require('../middleware/upload');

// A minimal app with the same error mapping as app.js, so we exercise the
// filter and limits without needing a token.
const app = express();
app.post('/u', upload.single('cv'), (req, res) => res.json({ ok: true, saved: path.extname(req.file.path) }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File is too large. Maximum size is 5 MB.' });
    return res.status(400).json({ error: 'Upload rejected. Send a single file in the "cv" field.' });
  }
  res.status(500).json({ error: 'unexpected' });
});

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cvtest-'));
const fixture = (name, bytes) => {
  const p = path.join(tmp, name);
  fs.writeFileSync(p, bytes);
  return p;
};

test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

test('accepts a txt whose extension and mimetype agree', async () => {
  const res = await request(app).post('/u').attach('cv', fixture('cv.txt', 'hello'), { contentType: 'text/plain' });
  assert.equal(res.status, 200);
});

test('rejects a file over 5 MB with 413, not 500', async () => {
  const res = await request(app)
    .post('/u')
    .attach('cv', fixture('big.pdf', Buffer.alloc(6 * 1024 * 1024)), { contentType: 'application/pdf' });

  assert.equal(res.status, 413);
  assert.match(res.body.error, /too large/i);
});

// The filter used to be an OR, so either signal alone let a file through.
test('rejects when extension and mimetype disagree', async () => {
  const res = await request(app).post('/u').attach('cv', fixture('a.txt', 'x'), { contentType: 'application/pdf' });
  assert.equal(res.status, 400);
});

test('rejects legacy .doc, which mammoth cannot read', async () => {
  const res = await request(app).post('/u').attach('cv', fixture('old.doc', 'x'), { contentType: 'application/msword' });
  assert.equal(res.status, 400);
});

test('rejects an executable extension outright', async () => {
  const res = await request(app).post('/u').attach('cv', fixture('evil.js', 'x'), { contentType: 'text/plain' });
  assert.equal(res.status, 400);
});

test('saves with an extension from the allow-list, not the client filename', async () => {
  const res = await request(app).post('/u').attach('cv', fixture('cv.txt', 'hello'), { contentType: 'text/plain' });
  assert.equal(res.body.saved, '.txt');
});
