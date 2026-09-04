#!/usr/bin/env node
/**
 * Checks the local setup and says exactly what is missing and where to fix it.
 * Run with: npm run doctor
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const dns = require('dns').promises;

const ROOT = path.join(__dirname, '..', '..');
const results = [];

const ok = (label, detail = '') => results.push({ level: 'ok', label, detail });
const warn = (label, detail) => results.push({ level: 'warn', label, detail });
const bad = (label, detail) => results.push({ level: 'bad', label, detail });

function checkFiles() {
  const be = path.join(ROOT, 'backend', '.env');
  const fe = path.join(ROOT, 'frontend', '.env');

  fs.existsSync(be)
    ? ok('backend/.env exists')
    : bad('backend/.env is missing', 'cp backend/.env.example backend/.env   (SETUP.md)');

  fs.existsSync(fe)
    ? ok('frontend/.env exists')
    : bad('frontend/.env is missing', 'cp frontend/.env.example frontend/.env   (SETUP.md)');
}

function checkVar(name, { placeholderHints = [], hint }) {
  const value = process.env[name];

  if (!value) return bad(`${name} is not set`, hint);
  if (placeholderHints.some((p) => value.toLowerCase().includes(p))) {
    return bad(`${name} still holds the placeholder value`, hint);
  }
  return ok(name, `${value.slice(0, 14)}…`);
}

async function checkMongo() {
  const uri = process.env.MONGO_URI;
  if (!uri) return;

  try {
    const mongoose = require('mongoose');
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 6000 });
    await mongoose.disconnect();
    ok('MongoDB reachable');
  } catch (err) {
    bad('Cannot connect to MongoDB', `${err.message.split('\n')[0]}
      · Password not URL-encoded? @ becomes %40
      · Atlas > Network Access > allow 0.0.0.0/0 for development`);
  }
}

async function checkAuth0() {
  const domain = process.env.AUTH0_DOMAIN;
  if (!domain) return;

  if (domain.startsWith('http')) {
    return bad('AUTH0_DOMAIN must not include https://', 'Use just: your-tenant.eu.auth0.com');
  }

  try {
    await dns.lookup(domain);
    const res = await fetch(`https://${domain}/.well-known/openid-configuration`);
    res.ok
      ? ok('Auth0 tenant resolves and is live')
      : bad(`Auth0 tenant returned ${res.status}`, 'Check AUTH0_DOMAIN spelling.');
  } catch {
    bad('Auth0 domain does not resolve', `No tenant at ${domain}. Check SETUP.md section 3a.`);
  }
}

async function checkGemini() {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.includes('your-')) return;

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  try {
    const { GoogleGenAI } = require('@google/genai');
    const ai = new GoogleGenAI({ apiKey: key });
    const r = await ai.interactions.create({ model, input: 'Reply with the single word: ok' });
    ok(`Gemini responded (${model})`, (r.output_text || '').trim().slice(0, 20));
  } catch (err) {
    const { describeApiError } = require('../services/analyzeCV');
    const { status, reason, message } = describeApiError(err);

    if (reason === 'API_KEY_INVALID' || /API key not valid/i.test(message)) {
      bad('Gemini rejected the API key', 'Create a new one at https://aistudio.google.com/apikey');
    } else if (status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(`${reason} ${message}`)) {
      warn('Gemini is rate limited', 'The key works but the quota is spent. https://aistudio.google.com/rate-limit');
    } else if (status === 404 || /NOT_FOUND/i.test(reason)) {
      bad(`Model "${model}" is not available to this key`, 'Try GEMINI_MODEL=gemini-3.5-flash-lite');
    } else {
      bad('Gemini call failed', message.split('\n')[0]);
    }
  }
}

function checkAudienceMatch() {
  const be = process.env.AUTH0_AUDIENCE;
  const fePath = path.join(ROOT, 'frontend', '.env');
  if (!be || !fs.existsSync(fePath)) return;

  const match = fs.readFileSync(fePath, 'utf-8').match(/^VITE_AUTH0_AUDIENCE=(.*)$/m);
  const fe = match?.[1]?.trim();

  if (!fe) return bad('VITE_AUTH0_AUDIENCE is not set in frontend/.env', 'It must equal AUTH0_AUDIENCE.');

  fe === be
    ? ok('Audience matches across frontend and backend')
    : bad('Audience mismatch', `backend "${be}" vs frontend "${fe}" — these must be byte-identical, or every API call 401s.`);
}

(async () => {
  checkFiles();

  checkVar('MONGO_URI', { placeholderHints: ['<user>', '<password>'], hint: 'SETUP.md section 1' });
  checkVar('GEMINI_API_KEY', { placeholderHints: ['your-'], hint: 'SETUP.md section 2' });
  checkVar('AUTH0_DOMAIN', { placeholderHints: ['your-tenant'], hint: 'SETUP.md section 3a' });
  checkVar('AUTH0_AUDIENCE', { placeholderHints: [], hint: 'SETUP.md section 3b' });

  checkAudienceMatch();

  await checkMongo();
  await checkAuth0();
  await checkGemini();

  const icon = { ok: '\x1b[32m✓\x1b[0m', warn: '\x1b[33m!\x1b[0m', bad: '\x1b[31m✗\x1b[0m' };
  console.log('\nCVlens setup check\n');
  for (const r of results) {
    console.log(`  ${icon[r.level]} ${r.label}`);
    if (r.detail && r.level !== 'ok') console.log(`      ${r.detail}\n`);
  }

  const failures = results.filter((r) => r.level === 'bad').length;
  console.log(
    failures === 0
      ? '\nAll checks passed — run `npm run dev`.\n'
      : `\n${failures} problem${failures === 1 ? '' : 's'} to fix. See SETUP.md.\n`
  );
  process.exit(failures === 0 ? 0 : 1);
})();
