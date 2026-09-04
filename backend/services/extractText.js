const fs = require('fs/promises');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Pull plain text out of an uploaded CV.
 * All reads are async -- these used to be readFileSync inside an async handler,
 * which blocked the event loop for the whole read.
 *
 * @param {string} filePath
 * @param {'pdf'|'docx'|'txt'} fileType
 * @returns {Promise<string>}
 */
async function extractText(filePath, fileType) {
  try {
    if (fileType === 'pdf') {
      const buffer = await fs.readFile(filePath);
      const data = await pdfParse(buffer);
      return data.text.trim();
    }

    if (fileType === 'docx') {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value.trim();
    }

    if (fileType === 'txt') {
      const text = await fs.readFile(filePath, 'utf-8');
      return text.trim();
    }

    throw new Error(`Unsupported file type: ${fileType}`);
  } catch (err) {
    throw new Error(`Failed to extract text from file: ${err.message}`);
  }
}

const CV_KEYWORDS = [
  'experience', 'education', 'skills', 'work', 'university', 'degree', 'email',
  'phone', 'project', 'engineer', 'developer', 'manager', 'analyst', 'intern',
  'summary', 'objective', 'certification', 'languages', 'employment', 'career',
  'bachelor', 'master', 'diploma', 'portfolio', 'reference', 'achievements'
];

const MIN_CHARS = 100;
const MAX_CHARS = 50000;

/**
 * Cheap sanity gate before spending an AI call on the text.
 * @returns {{valid: boolean, reason?: string}}
 */
function validateCVText(text) {
  if (!text || text.length < MIN_CHARS) {
    return {
      valid: false,
      reason:
        'This file appears to be empty or too short to be a CV. If it is a scanned ' +
        'PDF, the text cannot be read — export a text-based PDF and try again.'
    };
  }

  if (text.length > MAX_CHARS) {
    return {
      valid: false,
      reason: 'This document is too long. A standard CV is 1-3 pages.'
    };
  }

  const lower = text.toLowerCase();
  const hits = CV_KEYWORDS.filter((kw) => lower.includes(kw)).length;

  if (hits < 3) {
    return {
      valid: false,
      reason: 'This does not appear to be a CV or resume. Please upload your CV.'
    };
  }

  return { valid: true };
}

module.exports = { extractText, validateCVText };
