const jose = require('jose');
const redisClient = require('../utils/redisClient');  // Import the common Redis client

async function requiresValidLogoutToken(req, res, next) {
  const JWKS = jose.createRemoteJWKSet(
    new URL(process.env.AUTH0_ISSUER_BASE_URL + '/.well-known/jwks.json')
  );

  const logoutToken = req.body.logout_token;

  if (!logoutToken) {
    return res.status(400).send('Need logout token');
  }

  try {
    const { payload, protectedHeader } = await jose.jwtVerify(logoutToken, JWKS, {
      issuer: process.env.AUTH0_ISSUER_BASE_URL + '/',
      audience: process.env.AUTH0_CLIENT_ID,
      typ: 'JWT',
      maxTokenAge: '2 minutes',
    });

    // Verify that the Logout token contains a sub claim, a sid claim, or both
    if (!payload.sub && !payload.sid) {
      return res.status(400).send('Error: Logout token must contain either sub claim or sid claim, or both');
    }

    // Verify that the logout token contains an events claim
    if (!payload.events['http://schemas.openid.net/event/backchannel-logout']) {
      return res.status(400).send('Error: Logout token must contain events claim with correct schema');
    }

    // Verify that the Logout token does not contain a nonce claim.
    if (payload.nonce) {
      return res.status(400).send('Error: Logout token must not contain a nonce claim');
    }

    // Store the logout event in Upstash Redis (optional)
    if (payload.sid) {
      await redisClient.set(`logout:${payload.sid}`, 'true');
    }

    if (payload.sub) {
      await redisClient.set(`user:${payload.sub}:logout`, 'true');
    }

    // Attach valid logout token to request object
    req.logoutToken = payload;

    next();
  } catch (error) {
    res.status(400).send(`Error: ${error.message}`);
  }
}

module.exports = requiresValidLogoutToken;
