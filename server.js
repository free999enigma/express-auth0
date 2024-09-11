const dotenv = require('dotenv');
const express = require('express');
const logger = require('morgan');
const path = require('path');
const router = require('./routes/index');
const { auth } = require('express-openid-connect');

// Load environment variables
dotenv.config();
console.log('Environment variables loaded');
console.log(`BASE_URL: ${process.env.BASE_URL || 'Not Set'}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'Not Set'}`);
console.log(`AUTH0_CLIENT_ID: ${process.env.AUTH0_CLIENT_ID || 'Not Set'}`);
console.log(`AUTH0_ISSUER_BASE_URL: ${process.env.AUTH0_ISSUER_BASE_URL || 'Not Set'}`);
console.log(`AUTH0_CLIENT_SECRET: ${process.env.AUTH0_CLIENT_SECRET ? 'Set' : 'Not Set'}`);

// Avoid logging PORT in production (Vercel)
if (process.env.NODE_ENV !== 'production') {
  console.log(`PORT: ${process.env.PORT || 'Not Set'}`);
} else {
  console.log('Running in production mode (Vercel)');
}

const app = express();

// Set up view engine
console.log('Setting up view engine and views directory');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Set up logger, static files, and JSON parser
app.use(logger('dev'));
console.log('Morgan logger initialized');
app.use(express.static(path.join(__dirname, 'public')));
console.log('Static file directory set to /public');
app.use(express.json());
console.log('JSON parser middleware initialized');

// Auth0 configuration
const config = {
  authRequired: false,               // Keep as it is
  auth0Logout: true,                 // Keep as it is
};
console.log('Auth0 configuration initialized with authRequired: false and auth0Logout: true');

// Initialize Auth0 middleware
try {
  app.use(auth(config));
  console.log('Auth0 middleware initialized successfully');
} catch (error) {
  console.error('Error initializing Auth0 middleware:', error);
}

// Middleware to make the `user` object available for all views
app.use((req, res, next) => {
  console.log(`Processing request for: ${req.url}`);
  if (req.oidc && req.oidc.user) {
    console.log(`Authenticated user: ${req.oidc.user.email}`);
  } else {
    console.log('No authenticated user');
  }
  res.locals.user = req.oidc ? req.oidc.user : null;
  next();
});

// Route handling
console.log('Router middleware initialized');
app.use('/', router);

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
});

// Only listen to the port in local development
if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`Server running locally at http://localhost:${port}`);
  });
} else {
  console.log('Running on Vercel, no need to bind to a specific port');
}

module.exports = app; // Export the app for Vercel
