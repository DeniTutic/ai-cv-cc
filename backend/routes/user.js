const express = require('express');
const router = express.Router();
const checkJwt = require('../middleware/auth');
const { requireUser } = require('../middleware/auth');
const User = require('../models/User');

router.use(checkJwt, requireUser);

// GET /api/user/me — get or create the caller's profile
router.get('/me', async (req, res, next) => {
  try {
    const payload = req.auth?.payload || {};

    const user = await User.findOneAndUpdate(
      { auth0Id: req.auth0Id },
      {
        $setOnInsert: { auth0Id: req.auth0Id },
        $set: {
          email: payload.email || '',
          name: payload.name || payload.nickname || '',
          picture: payload.picture || ''
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
