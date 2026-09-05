const { auth } = require('express-oauth2-jwt-bearer');

const { AUTH0_AUDIENCE, AUTH0_DOMAIN } = process.env;

const isConfigured = Boolean(AUTH0_AUDIENCE && AUTH0_DOMAIN);

const MISCONFIGURED_MESSAGE =
  'AUTH0_DOMAIN and AUTH0_AUDIENCE are required. Set them in the environment ' +
  '(see SETUP.md section 3).';

/**
 * Auth0 JWT validation.
 *
 * When the config is missing we must NOT fall through to `next()`. Doing so
 * leaves `req.auth` undefined, and because Mongoose strips undefined keys out of
 * query filters, `find({ auth0Id: undefined })` silently widens to `find({})` --
 * i.e. every user's data returned to an unauthenticated caller.
 *
 * It must not throw at import time either. On serverless that kills the whole
 * function, so every route -- including the health check -- returns an opaque
 * platform 500 with no way to tell why. Instead we refuse each request with a
 * clean, diagnosable response. server.js still exits on boot in production, so
 * a long-lived deploy fails fast rather than serving errors.
 */
function buildAuthMiddleware() {
  if (isConfigured) {
    return auth({
      audience: AUTH0_AUDIENCE,
      issuerBaseURL: `https://${AUTH0_DOMAIN}/`,
      tokenSigningAlg: 'RS256'
    });
  }

  console.error(`[auth] ${MISCONFIGURED_MESSAGE}`);
  console.error('[auth] Every protected route will refuse requests until this is fixed.');

  return (req, res) => {
    res.status(503).json({ error: 'Server authentication is not configured.' });
  };
}

const checkJwt = buildAuthMiddleware();

/**
 * Defence in depth: runs after checkJwt and guarantees a usable subject claim,
 * so no route can ever build a query around an undefined auth0Id.
 */
function requireUser(req, res, next) {
  const auth0Id = req.auth?.payload?.sub;

  if (typeof auth0Id !== 'string' || auth0Id.length === 0) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  req.auth0Id = auth0Id;
  next();
}

module.exports = checkJwt;
module.exports.checkJwt = checkJwt;
module.exports.requireUser = requireUser;
module.exports.isConfigured = isConfigured;
module.exports.MISCONFIGURED_MESSAGE = MISCONFIGURED_MESSAGE;
