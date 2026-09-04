require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');

const { apiLimiter } = require('./middleware/rateLimit');
const cvRoutes = require('./routes/cv');
const userRoutes = require('./routes/user');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use('/api/', apiLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/cv', cvRoutes);
app.use('/api/user', userRoutes);

// JSON 404 so the frontend never has to parse an HTML error page.
app.use((req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Multer errors carry a code but no status, so they used to fall through as 500.
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File is too large. Maximum size is 5 MB.' });
    }
    return res.status(400).json({ error: 'Upload rejected. Send a single file in the "cv" field.' });
  }

  if (err.status === 401 || err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  // Log the detail, return a generic message: err.message can carry internal
  // Mongoose and driver text that clients have no business seeing.
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ error: 'An unexpected error occurred. Please try again.' });
});

async function start() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set. Copy backend/.env.example to backend/.env (see SETUP.md).');
    process.exit(1);
  }

  try {
    // Awaited before listen, so the server never accepts traffic it cannot serve.
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

start();

module.exports = app;
