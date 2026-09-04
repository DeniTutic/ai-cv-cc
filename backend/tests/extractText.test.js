const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
require('./helpers');

const { extractText, validateCVText } = require('../services/extractText');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cvextract-'));
test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

const CV = `JANE DOE
Software Engineer | jane@example.com

WORK EXPERIENCE
Software Engineer, ACME (2021-2025)
- Built the backend

EDUCATION
BSc Computer Science, University of Sarajevo, 2020

SKILLS
JavaScript, React, Node.js`;

test('extracts text from a txt file', async () => {
  const p = path.join(tmp, 'cv.txt');
  fs.writeFileSync(p, CV);
  const text = await extractText(p, 'txt');
  assert.match(text, /JANE DOE/);
});

test('an unsupported type throws a wrapped, readable error', async () => {
  const p = path.join(tmp, 'x.txt');
  fs.writeFileSync(p, CV);
  await assert.rejects(() => extractText(p, 'rtf'), /Unsupported file type/);
});

test('accepts a plausible CV', () => {
  assert.equal(validateCVText(CV).valid, true);
});

test('rejects text that is too short', () => {
  const r = validateCVText('hello');
  assert.equal(r.valid, false);
  assert.match(r.reason, /empty or too short/i);
});

test('a short document mentions scanned PDFs, which is the usual cause', () => {
  assert.match(validateCVText('hi').reason, /scanned/i);
});

test('rejects a document that is not a CV', () => {
  const r = validateCVText('the quick brown fox jumps over the lazy dog. '.repeat(20));
  assert.equal(r.valid, false);
  assert.match(r.reason, /does not appear to be a CV/i);
});

test('rejects a document that is too long', () => {
  const r = validateCVText(`${CV} `.repeat(2000));
  assert.equal(r.valid, false);
  assert.match(r.reason, /too long/i);
});
