const express = require('express');
const router = express.Router();
const checkJwt = require('../middleware/auth');
const User = require('../models/User');

// GET /api/user/me — get or create user profile
router.get('/me', checkJwt, async (req, res) => {
  try {
    const auth0Id = req.auth?.payload?.sub;
    let user = await User.findOne({ auth0Id });

    if (!user) {
      const payload = req.auth?.payload;
      user = await User.create({
        auth0Id,
        email: payload?.email || '',
        name: payload?.name || payload?.nickname || ''
      });
    }

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
});

module.exports = router;
