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

// Avoid logging PORT in production (Vercel)
if (process.env.NODE_ENV !== 'production') {
  console.log(`PORT: ${process.env.PORT}`);
}

const app = express();

// Set up view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Auth0 configuration
const config = {
  authRequired: false,
  auth0Logout: true,
  baseURL: process.env.BASE_URL || 'http://localhost:3000',
  clientID: process.env.CLIENT_ID,
  issuerBaseURL: process.env.ISSUER_BASE_URL,
};

app.use(auth(config));

// Middleware to make the `user` object available for all views
app.use(function (req, res, next) { res.locals.user = req.oidc.user; next();});

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
