const rateLimit = require('express-rate-limit');

/** Broad limit for the whole API. */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' }
});

/**
 * Tight limit for the expensive path only. This used to be mounted on the whole
 * /api/cv router, which meant 10 requests/hour also throttled reading your own
 * history and stats -- opening the dashboard a few times locked you out.
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Upload limit reached (10 per hour). Please try again later.' }
});

module.exports = { apiLimiter, uploadLimiter };
