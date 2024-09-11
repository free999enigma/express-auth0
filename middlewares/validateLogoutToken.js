const jose = require('jose');
const { Redis } = require('@upstash/redis');

// Initialize the Upstash Redis client
const redisClient = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

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
    // whose value is a JSON object containing the member name http://schemas.openid.net/event/backchannel-logout
    if (!payload.events['http://schemas.openid.net/event/backchannel-logout']) {
      return res.status(400).send('Error: Logout token must contain events claim with correct schema');
    }

    // Verify that the Logout token does not contain a nonce claim.
    if (payload.nonce) {
      return res.status(400).send('Error: Logout token must not contain a nonce claim');
    }

    // Store the logout event in Upstash Redis (optional)
    if (payload.sid) {
      // Store the session ID in Redis to track the logout event
      await redisClient.set(`logout:${payload.sid}`, 'true');
    }

    if (payload.sub) {
      // Optionally, you could maintain a record of the user's logout status
      await redisClient.set(`user:${payload.sub}:logout`, 'true');
    }

    // attach valid logout token to request object
    req.logoutToken = payload;

    // token is valid, call next middleware
    next();
  } catch (error) {
    res.status(400).send(`Error: ${error.message}`);
  }
}

module.exports = requiresValidLogoutToken;
