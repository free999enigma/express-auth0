const jose = require('jose');
const redisClient = require('../utils/redisClient');  // Import the common Redis client

async function requiresValidLogoutToken(req, res, next) {
    console.log("Starting logout token validation...");
  
    // Ensure the JWKS URL is correctly formatted
    const JWKS = jose.createRemoteJWKSet(
      new URL(process.env.AUTH0_ISSUER_BASE_URL + '/.well-known/jwks.json')
    );
  
    const logoutToken = req.body.logout_token;
    console.log("Received logout token:", logoutToken);
  
    if (!logoutToken) {
      console.log("No logout token provided");
      return res.status(400).send('Need logout token');
    }
  
    try {
      const { payload, protectedHeader } = await jose.jwtVerify(logoutToken, JWKS, {
        issuer: process.env.AUTH0_ISSUER_BASE_URL + '/',
        audience: process.env.AUTH0_CLIENT_ID,
        typ: 'JWT',
        maxTokenAge: '2 minutes',
      });
  
      console.log("Logout token successfully verified. Payload:", payload);
      console.log("Protected header:", protectedHeader);
  
      // Check for claims
      if (!payload.sub && !payload.sid) {
        console.log("Invalid logout token: Missing 'sub' or 'sid' claims.");
        return res.status(400).send('Error: Logout token must contain either sub claim or sid claim, or both');
      }
  
      if (!payload.events || !payload.events['http://schemas.openid.net/event/backchannel-logout']) {
        console.log("Invalid logout token: Missing events claim with correct schema.");
        return res.status(400).send('Error: Logout token must contain events claim with correct schema');
      }
  
      if (payload.nonce) {
        console.log("Invalid logout token: Contains a nonce claim.");
        return res.status(400).send('Error: Logout token must not contain a nonce claim');
      }
  
      // Store the logout event in Redis
      if (payload.sid) {
        console.log(`Storing session logout status in Redis for sid: ${payload.sid}`);
        await redisClient.set(`logout:${payload.sid}`, 'true');
      }
  
      if (payload.sub) {
        console.log(`Storing user logout status in Redis for sub: ${payload.sub}`);
        await redisClient.set(`user:${payload.sub}:logout`, 'true');
      }
  
      req.logoutToken = payload;
      console.log("Logout token processing completed successfully.");
      next();
    } catch (error) {
      console.error("Error during logout token validation:", error.message);
      res.status(400).send(`Error: ${error.message}`);
    }
  }
  

module.exports = requiresValidLogoutToken;
