const express = require('express');
const router = express.Router();
const { requiresAuth } = require('express-openid-connect');

// middleware to validate the logout token
const requiresValidLogoutToken = require('../middlewares/validateLogoutToken');

// helper function to delete user sessions
const deleteUserSessions = require('../utils/sessions');

// new route to receive backchannel logout tokens
// must be configured in the Application -> Sessions tab 
// in the Auth0 Management Dashboard
router.post(
  '/backchannel-logout',
  requiresValidLogoutToken,
  function (req, res, next) {
    // at this point the logout token is valid, checked by requiresValidLogoutToken middleware
    // you can access it from the request object: req.logoutToken

    // delete user session so the user gets logged out
    deleteUserSessions(
      req.app.locals.sessionStore,
      req.logoutToken.sub,
      req.logoutToken.sid
    );

    res.sendStatus(200);
  }
);
router.get('/', function (req, res, next) {
  res.render('index', {
    title: 'Auth0 Webapp sample Nodejs',
    isAuthenticated: req.oidc.isAuthenticated()
  });
});

router.get('/profile', requiresAuth(), function (req, res, next) {
  res.render('profile', {
    userProfile: JSON.stringify(req.oidc.user, null, 2),
    title: 'Profile page'
  });
});

module.exports = router;
