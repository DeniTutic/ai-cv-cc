// Auth0 config must exist BEFORE middleware/auth is required, otherwise the
// module builds its 401-everything development fallback instead of a verifier.
process.env.AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || 'test-tenant.eu.auth0.com';
process.env.AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || 'https://api.ai-cv-analyzer.com';
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-key';
process.env.NODE_ENV = 'test';

const MONGO_TEST_URI =
  process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/ai-cv-analyzer-test';

/** True when a mongod is reachable, so DB-backed tests can skip cleanly. */
async function mongoAvailable() {
  const net = require('net');
  const { hostname, port } = new URL(MONGO_TEST_URI.replace('mongodb://', 'http://'));

  return new Promise((resolve) => {
    const socket = net.createConnection({ host: hostname, port: Number(port) || 27017 });
    const done = (result) => { socket.destroy(); resolve(result); };
    socket.setTimeout(700);
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
    socket.once('timeout', () => done(false));
  });
}

module.exports = { MONGO_TEST_URI, mongoAvailable };
