const dotenv = require('dotenv');
const express = require('express');
const logger = require('morgan');
const path = require('path');
const router = require('../routes/index');
const { auth } = require('express-openid-connect');

// Load environment variables
dotenv.config();

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const config = {
  authRequired: false,
  auth0Logout: true,
};

// Base URL fallback for development
if (!config.baseURL && process.env.PORT && process.env.NODE_ENV !== 'production') {
  config.baseURL = `http://localhost:${process.env.PORT || 3000}`;
}

app.use(auth(config));

// Middleware to make the `user` object available for all views
app.use((req, res, next) => {
  res.locals.user = req.oidc.user;
  next();
});

app.use('/', router);

// Error handling
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: process.env.NODE_ENV !== 'production' ? err : {}
  });
});

// For local development, conditionally listen to the port
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running locally at http://localhost:${port}`);
  });
}

module.exports = app; // Export the app for Vercel and local.js
