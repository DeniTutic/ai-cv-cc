const test = require('node:test');
const assert = require('node:assert/strict');
require('./helpers');

const { extractText, validateCVText } = require('../services/extractText');

const CV = `JANE DOE
Software Engineer | jane@example.com

WORK EXPERIENCE
Software Engineer, ACME (2021-2025)
- Built the backend

EDUCATION
BSc Computer Science, University of Sarajevo, 2020

SKILLS
JavaScript, React, Node.js`;

// Buffers, not temp files: uploads are held in memory now, so the tests exercise
// the same input shape the routes actually pass.
test('extracts text from a txt buffer', async () => {
  const text = await extractText(Buffer.from(CV, 'utf-8'), 'txt');
  assert.match(text, /JANE DOE/);
});

test('an unsupported type throws a wrapped, readable error', async () => {
  await assert.rejects(() => extractText(Buffer.from(CV), 'rtf'), /Unsupported file type/);
});

test('a missing buffer fails clearly rather than throwing deep in a parser', async () => {
  await assert.rejects(() => extractText(undefined, 'txt'), /no file contents/i);
});

test('a corrupt docx surfaces as an extraction failure, not a crash', async () => {
  await assert.rejects(
    () => extractText(Buffer.from('this is definitely not a zip'), 'docx'),
    /Failed to extract text from file/
  );
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
