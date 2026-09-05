require('dotenv').config();

const mongoose = require('mongoose');
const { createApp } = require('../app');

/**
 * Serverless entry point.
 *
 * Every invocation may land on a cold or a warm instance. Opening a Mongoose
 * connection per invocation would exhaust both the Atlas connection limit and
 * the platform's file-descriptor budget, so the connection promise is cached on
 * globalThis: warm instances reuse the socket, and concurrent cold requests
 * await the same in-flight promise instead of each dialling out.
 */
const CACHE_KEY = '__cvlensMongo';

function connectionCache() {
  if (!globalThis[CACHE_KEY]) {
    globalThis[CACHE_KEY] = { conn: null, promise: null };
  }
  return globalThis[CACHE_KEY];
}

async function connectToDatabase() {
  const cache = connectionCache();

  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not set.');
    }

    cache.promise = mongoose
      .connect(process.env.MONGO_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10000,
        // The driver would otherwise queue operations against a dead connection
        // until they time out with an unhelpful error.
        bufferCommands: false
      })
      .catch((err) => {
        // Clear the cached promise so the next request retries rather than
        // resolving the same rejection forever.
        cache.promise = null;
        throw err;
      });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}

// Passed as beforeRoutes, NOT app.use() after the fact: Express runs middleware
// in registration order, so mounting this after createApp() had already added the
// routes would mean handlers ran against an unconnected Mongoose.
async function ensureDatabase(req, res, next) {
  try {
    await connectToDatabase();
    next();
  } catch (err) {
    console.error('Database connection failed:', err.message);
    res.status(503).json({ error: 'The service is temporarily unavailable. Please try again.' });
  }
}

const app = createApp({ beforeRoutes: ensureDatabase });

module.exports = app;
module.exports.connectToDatabase = connectToDatabase;
