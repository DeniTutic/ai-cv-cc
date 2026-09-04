const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');

const { apiLimiter } = require('./middleware/rateLimit');
const cvRoutes = require('./routes/cv');
const userRoutes = require('./routes/user');

/**
 * The Express app, with no side effects: no DB connection, no listen.
 * server.js owns the bootstrap so tests can import the app directly.
 */
function createApp({ rateLimit = true } = {}) {
  const app = express();

  app.use(helmet());
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  }));

  // Disabled under test so a suite of requests doesn't trip the limiter.
  if (rateLimit) app.use('/api/', apiLimiter);

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/cv', cvRoutes);
  app.use('/api/user', userRoutes);

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found.' });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File is too large. Maximum size is 5 MB.' });
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
