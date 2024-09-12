const express = require('express');
const router = express.Router();
const { requiresAuth } = require('express-openid-connect');
const requiresValidLogoutToken = require('../middlewares/validateLogoutToken');
const redisClient = require('../utils/redisClient');  // Import the common Redis client

// Helper function to delete user sessions from Redis
async function deleteUserSessions(sub, sid) {
  try {
    // Remove the session using the session ID (sid) from Redis
    if (sid) {
      await redisClient.del(`logout:${sid}`);
      console.log(`Session with sid ${sid} deleted from Redis.`);
    }

    // Optionally remove the user's session status using the user ID (sub)
    if (sub) {
      await redisClient.del(`user:${sub}:logout`);
      console.log(`Logout status for user ${sub} deleted from Redis.`);
    }
  } catch (error) {
    console.error(`Failed to delete session for user ${sub} or sid ${sid}: ${error.message}`);
  }
}

// Route to receive backchannel logout tokens
// Must be configured in the Application -> Sessions tab 
// in the Auth0 Management Dashboard
router.post('/backchannel-logout', requiresValidLogoutToken, async function (req, res, next) {
  try {
    // Ensure req.logoutToken is valid
    if (!req.logoutToken) {
      console.error("No valid logout token in request.");
      return res.status(400).send('No valid logout token.');
    }

    const { sub, sid } = req.logoutToken;
    await deleteUserSessions(sub, sid);
    res.sendStatus(200);
  } catch (error) {
    console.error(`Error handling backchannel logout: ${error.message}`);
    res.sendStatus(500);
  }
});


router.get('/', function (req, res, next) {
  res.render('index', {
    title: 'Auth0 Webapp sample Nodejs',
    isAuthenticated: req.oidc.isAuthenticated(),
  });
});

router.get('/profile', requiresAuth(), function (req, res, next) {
  res.render('profile', {
    userProfile: JSON.stringify(req.oidc.user, null, 2),
    title: 'Profile page',
  });
});

module.exports = router;
