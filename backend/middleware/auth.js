const { auth } = require('express-oauth2-jwt-bearer');

const { AUTH0_AUDIENCE, AUTH0_DOMAIN, NODE_ENV } = process.env;

/**
 * Auth0 JWT validation.
 *
 * If the Auth0 config is missing we must NOT fall through to `next()`. Doing so
 * leaves `req.auth` undefined, and because Mongoose strips undefined keys out of
 * query filters, `find({ auth0Id: undefined })` silently widens to `find({})` --
 * i.e. every user's data is returned to an unauthenticated caller. So: hard fail
 * on boot in production, and reject every request with 401 in development.
 */
function buildAuthMiddleware() {
  if (AUTH0_AUDIENCE && AUTH0_DOMAIN) {
    return auth({
      audience: AUTH0_AUDIENCE,
      issuerBaseURL: `https://${AUTH0_DOMAIN}/`,
      tokenSigningAlg: 'RS256'
    });
  }

  const message =
    'AUTH0_DOMAIN and AUTH0_AUDIENCE are required. Copy backend/.env.example to ' +
    'backend/.env and fill them in (see SETUP.md section 3).';

  if (NODE_ENV === 'production') {
    throw new Error(message);
  }

  console.error(`\n[auth] ${message}\n[auth] All protected routes will return 401 until this is fixed.\n`);

  return (req, res, next) => {
    res.status(401).json({ error: 'Server authentication is not configured.' });
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
