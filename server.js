const dotenv = require('dotenv');
const express = require('express');
const logger = require('morgan');
const path = require('path');
const router = require('./routes/index');
const { auth } = require('express-openid-connect');

// Load environment variables
dotenv.config();
console.log('Environment variables loaded');
console.log(`BASE_URL: ${process.env.BASE_URL}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`PORT: ${process.env.PORT}`);

const app = express();

// Set up view engine
console.log('Setting up view engine and views directory');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Set up logging and middleware
app.use(logger('dev'));
console.log('Morgan logger initialized (dev mode)');

app.use(express.static(path.join(__dirname, 'public')));
console.log('Public directory set up for static files');

app.use(express.json());
console.log('JSON body parser middleware initialized');

// Auth0 configuration
const config = {
  authRequired: false,
  auth0Logout: true,
};

console.log('Auth0 configuration initialized');

// Base URL fallback for development
if (!config.baseURL && process.env.PORT && process.env.NODE_ENV !== 'production') {
  config.baseURL = `http://localhost:${process.env.PORT || 3000}`;
}
console.log(`Auth0 baseURL set to: ${config.baseURL}`);

app.use(auth(config));
console.log('Auth0 middleware applied');

// Middleware to make the `user` object available for all views
app.use((req, res, next) => {
  console.log('Processing request for', req.url);

  // Check if req.oidc is available
  if (req.oidc) {
    if (req.oidc.user) {
      console.log(`Authenticated user: ${req.oidc.user.email}`);
    } else {
      console.log('No authenticated user');
    }
    // Set the user object in locals
    res.locals.user = req.oidc.user;
  } else {
    console.log('req.oidc is undefined');
    res.locals.user = null;
  }

  next();
});


// Main route handling
app.use('/', router);
console.log('Router middleware initialized');

// Error handling for 404
app.use((req, res, next) => {
  console.log(`404 Error: ${req.url} not found`);
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// General error handling
app.use((err, req, res, next) => {
  console.error(`Error: ${err.message}`);
  console.error(`Stack Trace: ${err.stack}`);
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: process.env.NODE_ENV !== 'production' ? err : {},
  });
  console.log(`Error page rendered with status: ${err.status || 500}`);
});

// For local development, conditionally listen to the port
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running locally at http://localhost:${port}`);
  });
}

// Conditionally listen only in local development
if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running locally at http://localhost:${port}`);
  });
}


module.exports = app; // Export the app for Vercel and local.js
