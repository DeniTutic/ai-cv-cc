require('dotenv').config();

const mongoose = require('mongoose');
const { createApp } = require('./app');
const { isConfigured, MISCONFIGURED_MESSAGE } = require('./middleware/auth');

const PORT = process.env.PORT || 5000;

async function start() {
  // Fail fast in a long-lived process: refuse to start rather than serve a
  // deployment that cannot authenticate anyone. Serverless has no boot step, so
  // middleware/auth.js refuses each request there instead.
  if (process.env.NODE_ENV === 'production' && !isConfigured) {
    console.error(MISCONFIGURED_MESSAGE);
    process.exit(1);
  }

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

  createApp().listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

start();
