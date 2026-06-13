const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Extract plain text from a CV file.
 * Supports PDF, DOCX, and TXT.
 */
async function extractText(filePath, fileType) {
  const ext = fileType || path.extname(filePath).toLowerCase().replace('.', '');

  try {
    if (ext === 'pdf') {
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      return data.text.trim();
    }

    if (ext === 'docx' || ext === 'doc') {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value.trim();
    }

    if (ext === 'txt') {
      return fs.readFileSync(filePath, 'utf-8').trim();
    }

    throw new Error(`Unsupported file type: ${ext}`);
  } catch (err) {
    throw new Error(`Failed to extract text from file: ${err.message}`);
  }
}

/**
 * Basic validation that extracted text looks like a CV.
 * Checks minimum length and presence of common CV keywords.
 */
function validateCVText(text) {
  if (!text || text.length < 100) {
    return { valid: false, reason: 'The document appears to be empty or too short to be a CV.' };
  }

  if (text.length > 50000) {
    return { valid: false, reason: 'The document is too long. Please upload a standard 1-3 page CV.' };
  }

  // Check for some common CV-related terms (case-insensitive)
  const cvKeywords = ['experience', 'education', 'skills', 'work', 'university', 'degree',
    'email', 'phone', 'project', 'engineer', 'developer', 'manager', 'analyst',
    'intern', 'summary', 'objective', 'certification', 'languages'];

  const textLower = text.toLowerCase();
  const found = cvKeywords.filter(k => textLower.includes(k));

  if (found.length < 2) {
    return {
      valid: false,
      reason: 'The document does not appear to be a CV or resume. Please upload a valid CV file.'
    };
  }

  return { valid: true };
}

module.exports = { extractText, validateCVText };
