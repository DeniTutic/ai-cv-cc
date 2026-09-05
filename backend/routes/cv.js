const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const router = express.Router();

const checkJwt = require('../middleware/auth');
const { requireUser } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimit');
const CVAnalysis = require('../models/CVAnalysis');
const User = require('../models/User');
const { extractText, validateCVText } = require('../services/extractText');
const { analyzeCV } = require('../services/analyzeCV');

// Every route below is authenticated, and requireUser guarantees req.auth0Id is
// a non-empty string -- so no query can ever be built around an undefined id.
router.use(checkJwt, requireUser);

// Fields we accept from the model. Never spread raw model output into an update:
// it must not be able to touch status, auth0Id or errorMessage.
const AI_FIELDS = [
  'overallScore', 'atsScore', 'strengths', 'weaknesses', 'missingSkills',
  'grammarIssues', 'actionItems', 'recommendedImprovements',
  'improvedBulletPoints', 'improvedSummary', 'finalRecommendation'
];

function pickAiFields(result) {
  return AI_FIELDS.reduce((acc, key) => {
    if (result[key] !== undefined) acc[key] = result[key];
    return acc;
  }, {});
}

/** Keep the User record in step with the token's claims. */
async function upsertUser(req) {
  const payload = req.auth?.payload || {};
  await User.findOneAndUpdate(
    { auth0Id: req.auth0Id },
    {
      auth0Id: req.auth0Id,
      email: payload.email || payload[`${process.env.AUTH0_DOMAIN}/email`] || '',
      name: payload.name || payload.nickname || '',
      picture: payload.picture || ''
    },
    { upsert: true, new: true }
  );
}

// POST /api/cv/upload
router.post('/upload', uploadLimiter, upload.single('cv'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    await upsertUser(req);

    const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');
    if (!['pdf', 'docx', 'txt'].includes(ext)) {
      return res.status(400).json({ error: 'Unsupported file type. Use PDF, DOCX, or TXT.' });
    }

    let extractedText;
    try {
      extractedText = await extractText(req.file.buffer, ext);
    } catch (err) {
      return res.status(422).json({ error: `Could not read file: ${err.message}` });
    }

    const validation = validateCVText(extractedText);
    if (!validation.valid) {
      return res.status(422).json({ error: validation.reason });
    }

    const analysis = await CVAnalysis.create({
      auth0Id: req.auth0Id,
      originalFileName: req.file.originalname,
      fileType: ext,
      extractedText: extractedText.substring(0, 10000),
      status: 'processing'
    });

    let aiResult;
    try {
      aiResult = await analyzeCV(extractedText);
    } catch (err) {
      await CVAnalysis.findByIdAndUpdate(analysis._id, {
        status: 'failed',
        errorMessage: err.message
      });
      return res.status(502).json({ error: err.message });
    }

    const updated = await CVAnalysis.findByIdAndUpdate(
      analysis._id,
      { ...pickAiFields(aiResult), status: 'completed' },
      { new: true }
    );

    res.json({ message: 'Analysis complete', analysis: updated });
  } catch (err) {
    next(err);
  }
});

// GET /api/cv/history
router.get('/history', async (req, res, next) => {
  try {
    const analyses = await CVAnalysis.find({ auth0Id: req.auth0Id, status: 'completed' })
      .select('-extractedText')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ analyses });
  } catch (err) {
    next(err);
  }
});

// GET /api/cv/stats
router.get('/stats', async (req, res, next) => {
  try {
    const analyses = await CVAnalysis.find({ auth0Id: req.auth0Id, status: 'completed' })
      .select('overallScore atsScore createdAt')
      .sort({ createdAt: -1 });

    const total = analyses.length;

    res.json({
      total,
      bestScore: total ? Math.max(...analyses.map((a) => a.overallScore)) : null,
      // Sorted above -- without the sort this returned Mongo natural order,
      // which is usually the OLDEST record, not the latest.
      latestScore: total ? analyses[0].overallScore : null,
      previousScore: total > 1 ? analyses[1].overallScore : null
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/cv/:id
router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: 'Analysis not found.' });
    }

    // Scoped by auth0Id in the filter rather than fetch-then-compare.
    const analysis = await CVAnalysis.findOne({ _id: req.params.id, auth0Id: req.auth0Id });
    if (!analysis) return res.status(404).json({ error: 'Analysis not found.' });

    res.json({ analysis });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/cv/:id
router.delete('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: 'Analysis not found.' });
    }

    const deleted = await CVAnalysis.findOneAndDelete({ _id: req.params.id, auth0Id: req.auth0Id });
    if (!deleted) return res.status(404).json({ error: 'Analysis not found.' });

    res.json({ message: 'Analysis deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
