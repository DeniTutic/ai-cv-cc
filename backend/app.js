const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');

const { apiLimiter } = require('./middleware/rateLimit');
const cvRoutes = require('./routes/cv');
const userRoutes = require('./routes/user');

/**
 * FRONTEND_URL takes a comma-separated list, because a Vercel project serves the
 * production domain plus a different preview domain per deployment. Previews are
 * matched by suffix so they don't each need adding by hand.
 */
function buildCorsOrigin() {
  const allowed = (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const previewSuffix = process.env.VERCEL_PREVIEW_SUFFIX;

  return (origin, callback) => {
    // Same-origin, curl and server-to-server requests send no Origin header.
    if (!origin) return callback(null, true);
    if (allowed.includes(origin)) return callback(null, true);
    if (previewSuffix && origin.endsWith(previewSuffix)) return callback(null, true);

    return callback(new Error(`Origin ${origin} is not allowed by CORS.`));
  };
}

/**
 * The Express app, with no side effects: no DB connection, no listen.
 * server.js owns the bootstrap so tests can import the app directly.
 *
 * @param {object}   [options]
 * @param {boolean}  [options.rateLimit]    disable to stop a test suite tripping the limiter
 * @param {Function} [options.beforeRoutes] middleware run after parsing, before any route
 */
function createApp({ rateLimit = true, beforeRoutes } = {}) {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: buildCorsOrigin(), credentials: true }));

  // Disabled under test so a suite of requests doesn't trip the limiter.
  if (rateLimit) app.use('/api/', apiLimiter);

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Deliberately registered ahead of the beforeRoutes gate: the health check
  // reports that the process is serving, so a platform probe stays green during
  // a database blip and never costs a connection.
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Everything below runs only after this resolves. The serverless entry uses it
  // to await the cached database connection; registering it after the routes
  // would be too late, since Express runs middleware in registration order.
  if (beforeRoutes) app.use(beforeRoutes);

  app.use('/api/cv', cvRoutes);
  app.use('/api/user', userRoutes);

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found.' });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File is too large. Maximum size is 4 MB.' });
      }
      return res.status(400).json({ error: 'Upload rejected. Send a single file in the "cv" field.' });
    }

    if (err.status === 401 || err.name === 'UnauthorizedError') {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    console.error('Unhandled error:', err);
    res.status(err.status || 500).json({ error: 'An unexpected error occurred. Please try again.' });
  });

  return app;
}

module.exports = { createApp };
