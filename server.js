const dotenv = require('dotenv');
const express = require('express');
const logger = require('morgan');
const path = require('path');
const router = require('./routes/index');
const { auth } = require('express-openid-connect');
const serverless = require('serverless-http'); // Add serverless-http

// Measure time for loading environment variables
console.time('Load environment variables');
dotenv.config();
console.timeEnd('Load environment variables');
console.log('Environment variables loaded');
console.log(`BASE_URL: ${process.env.BASE_URL || 'Not Set'}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'Not Set'}`);
console.log(`AUTH0_CLIENT_ID: ${process.env.AUTH0_CLIENT_ID || 'Not Set'}`);
console.log(`AUTH0_ISSUER_BASE_URL: ${process.env.AUTH0_ISSUER_BASE_URL || 'Not Set'}`);
console.log(`AUTH0_CLIENT_SECRET: ${process.env.AUTH0_CLIENT_SECRET ? 'Set' : 'Not Set'}`);

// Measure time for setting up the port
console.time('Check PORT');
if (process.env.NODE_ENV !== 'production' || process.env.RUN_LOCALLY === 'true') {
  console.log(`PORT: ${process.env.PORT || 'Not Set'}`);
} else {
  console.log('Running in production mode (Vercel)');
}
console.timeEnd('Check PORT');

const app = express();

// Measure time for setting up view engine and static files
console.time('Set up view engine and static files');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
console.log('View engine and views directory set up');

app.use(logger('dev'));
console.log('Morgan logger initialized');
app.use(express.static(path.join(__dirname, 'public')));
console.log('Static file directory set to /public');
app.use(express.json());
console.log('JSON parser middleware initialized');
console.timeEnd('Set up view engine and static files');

// Measure time for initializing Auth0
console.time('Auth0 middleware setup');
const config = {
  authRequired: false,
  auth0Logout: true,
  baseURL: process.env.BASE_URL,
  clientID: process.env.AUTH0_CLIENT_ID,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  secret: process.env.AUTH0_CLIENT_SECRET,
};
console.log('Auth0 configuration initialized with authRequired: false and auth0Logout: true');
try {
  app.use(auth(config));
  console.log('Auth0 middleware initialized successfully');
} catch (error) {
  console.error('Error initializing Auth0 middleware:', error);
}
console.timeEnd('Auth0 middleware setup');

// Measure time for handling each request
app.use((req, res, next) => {
  console.time(`Request: ${req.url}`);
  console.log(`Processing request for: ${req.url}`);
  if (req.oidc && req.oidc.user) {
    console.log(`Authenticated user: ${req.oidc.user.email}`);
  } else {
    console.log('No authenticated user');
  }
  res.locals.user = req.oidc ? req.oidc.user : null;
  next();
  console.timeEnd(`Request: ${req.url}`);
});

// Measure time for route handling
console.time('Router middleware setup');
app.use('/', router);
console.timeEnd('Router middleware setup');

// Error handling for 404
app.use((req, res, next) => {
  console.time('Handle 404');
  console.log(`404 Error: ${req.url} not found`);
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
  console.timeEnd('Handle 404');
});

// General error handling
app.use((err, req, res, next) => {
  console.time('Handle error');
  console.error(`Error: ${err.message}`);
  console.error(`Stack Trace: ${err.stack}`);
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: process.env.NODE_ENV !== 'production' ? err : {},
  });
  console.timeEnd('Handle error');
});

// Use a flag to differentiate between local and serverless environments
const isServerless = process.env.VERCEL === '1' || process.env.SERVERLESS === 'true';

// Run server for local development
if (!isServerless) {
  const port = process.env.PORT || 3005;
  console.time('Server startup');

  const server = app.listen(port, () => {
    console.log(`Server running locally at http://localhost:3005`);
    console.timeEnd('Server startup');
  });

  // Error handling for server startup issues (like EADDRINUSE)
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Please use a different port.`);
    } else {
      console.error('Server error:', err);
    }
    process.exit(1); // Exit the process on error
  });
} else {
  console.log('Running on Vercel or serverless platform');
}

console.log(`PORT: ${process.env.PORT}`);
console.log(`RUN_LOCALLY: ${process.env.RUN_LOCALLY}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);

// Export the app as a serverless function for Vercel or local usage
module.exports = isServerless ? serverless(app) : app;

// Global error handlers
process.on('uncaughtException', (err) => {
  console.error('There was an uncaught exception:', err);
  process.exit(1); // Exit the process after logging the error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1); // Exit the process after logging the error
});
