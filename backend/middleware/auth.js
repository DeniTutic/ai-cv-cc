const { auth } = require('express-oauth2-jwt-bearer');

const { AUTH0_AUDIENCE, AUTH0_DOMAIN } = process.env;

if (!AUTH0_AUDIENCE || !AUTH0_DOMAIN) {
  // In development, if Auth0 config is missing, export a noop middleware
  // to avoid crashing the app. In production, ensure these env vars are set.
  console.warn('Warning: AUTH0_AUDIENCE or AUTH0_DOMAIN is not set. JWT validation is disabled.');
  module.exports = (req, res, next) => next();
} else {
  // Require the library only when needed so its verifier isn't invoked
  // at module-load time when configuration is incomplete.
  const { auth } = require('express-oauth2-jwt-bearer');

  const checkJwt = auth({
    audience: AUTH0_AUDIENCE,
    issuerBaseURL: `https://${AUTH0_DOMAIN}/`,
    tokenSigningAlg: 'RS256'
  });

  module.exports = checkJwt;
}
