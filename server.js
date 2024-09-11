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
if (process.env.NODE_ENV !== 'production') {
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
  authRequired: false,               // Keep as it is
  auth0Logout: true,                 // Keep as it is
  baseURL: process.env.BASE_URL,       // Base URL of your app
  clientID: process.env.AUTH0_CLIENT_ID,             // Auth0 Client ID
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,  // Auth0 Issuer URL (e.g., https://your-tenant.auth0.com)
  secret: process.env.AUTH0_CLIENT_SECRET,           // Auth0 Client Secret
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

// Measure time for setting up server in local development
if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 3001;
  console.time('Server startup');
  app.listen(port, () => {
    console.log(`Server running locally at http://localhost:${port}`);
    console.timeEnd('Server startup');
  });
} else {
  console.log('Running on Vercel, no need to bind to a specific port');
}

// Export the app as a serverless function for Vercel
module.exports = process.env.NODE_ENV === 'production' ? serverless(app) : app;
