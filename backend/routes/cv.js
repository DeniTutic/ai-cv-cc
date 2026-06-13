const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const checkJwt = require('../middleware/auth');
const upload = require('../middleware/upload');
const CVAnalysis = require('../models/CVAnalysis');
const User = require('../models/User');
const { extractText, validateCVText } = require('../services/extractText');
const { analyzeCV } = require('../services/openai');

// Helper: get Auth0 user ID from JWT
function getAuth0Id(req) {
  return req.auth?.payload?.sub;
}

// Helper: upsert user record
async function upsertUser(req) {
  const auth0Id = getAuth0Id(req);
  const payload = req.auth?.payload;
  await User.findOneAndUpdate(
    { auth0Id },
    {
      auth0Id,
      email: payload?.email || payload?.[`${process.env.AUTH0_DOMAIN}/email`] || '',
      name: payload?.name || payload?.nickname || ''
    },
    { upsert: true, new: true }
  );
}

// POST /api/cv/upload
router.post('/upload', checkJwt, upload.single('cv'), async (req, res) => {
  const filePath = req.file?.path;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    await upsertUser(req);
    const auth0Id = getAuth0Id(req);

    const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');
    const fileType = ['pdf', 'docx', 'doc', 'txt'].includes(ext) ? (ext === 'doc' ? 'docx' : ext) : null;

    if (!fileType) {
      return res.status(400).json({ error: 'Unsupported file type. Use PDF, DOCX, or TXT.' });
    }

    // Extract text from file
    let extractedText;
    try {
      extractedText = await extractText(filePath, fileType);
    } catch (err) {
      return res.status(422).json({ error: `Could not read file: ${err.message}` });
    }

    // Validate CV content
    const validation = validateCVText(extractedText);
    if (!validation.valid) {
      return res.status(422).json({ error: validation.reason });
    }

    // Create pending record
    const analysis = await CVAnalysis.create({
      auth0Id,
      originalFileName: req.file.originalname,
      fileType,
      extractedText: extractedText.substring(0, 10000), // Store first 10k chars
      status: 'processing'
    });

    // Run AI analysis
    let aiResult;
    try {
      aiResult = await analyzeCV(extractedText);
    } catch (err) {
      await CVAnalysis.findByIdAndUpdate(analysis._id, {
        status: 'failed',
        errorMessage: err.message
      });
      return res.status(502).json({ error: `AI analysis failed: ${err.message}` });
    }

    // Save completed analysis
    const updated = await CVAnalysis.findByIdAndUpdate(
      analysis._id,
      {
        ...aiResult,
        status: 'completed'
      },
      { new: true }
    );

    res.json({
      message: 'Analysis complete',
      analysis: updated
    });

  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  } finally {
    // Clean up uploaded file
    if (filePath && fs.existsSync(filePath)) {
      fs.unlink(filePath, () => {});
    }
  }
});

// GET /api/cv/history
router.get('/history', checkJwt, async (req, res) => {
  try {
    const auth0Id = getAuth0Id(req);
    const analyses = await CVAnalysis.find({ auth0Id, status: 'completed' })
      .select('-extractedText') // Exclude raw text from list
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ analyses });
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ error: 'Failed to fetch CV history.' });
  }
});

// GET /api/cv/stats
router.get('/stats', checkJwt, async (req, res) => {
  try {
    const auth0Id = getAuth0Id(req);
    const analyses = await CVAnalysis.find({ auth0Id, status: 'completed' })
      .select('overallScore atsScore createdAt');

    const total = analyses.length;
    const bestScore = total ? Math.max(...analyses.map(a => a.overallScore)) : null;
    const latestScore = total ? analyses[0].overallScore : null;

    res.json({ total, bestScore, latestScore });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

// GET /api/cv/:id
router.get('/:id', checkJwt, async (req, res) => {
  try {
    const auth0Id = getAuth0Id(req);
    const analysis = await CVAnalysis.findById(req.params.id);

    if (!analysis) return res.status(404).json({ error: 'Analysis not found.' });
    if (analysis.auth0Id !== auth0Id) return res.status(403).json({ error: 'Forbidden.' });

    res.json({ analysis });
  } catch (err) {
    console.error('Get analysis error:', err);
    res.status(500).json({ error: 'Failed to fetch analysis.' });
  }
});

// DELETE /api/cv/:id
router.delete('/:id', checkJwt, async (req, res) => {
  try {
    const auth0Id = getAuth0Id(req);
    const analysis = await CVAnalysis.findById(req.params.id);

    if (!analysis) return res.status(404).json({ error: 'Analysis not found.' });
    if (analysis.auth0Id !== auth0Id) return res.status(403).json({ error: 'Forbidden.' });

    await analysis.deleteOne();
    res.json({ message: 'Analysis deleted successfully.' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Failed to delete analysis.' });
  }
});

module.exports = router;
