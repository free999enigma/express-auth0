const dotenv = require('dotenv');
const express = require('express');
const logger = require('morgan');
const path = require('path');
const router = require('../routes/index');
const { auth } = require('express-openid-connect');
const { Redis } = require('@upstash/redis');

// Load environment variables
dotenv.config();

// Initialize the Upstash Redis client
const redisClient = new Redis({
  url: process.env.UPSTASH_REDIS_URL,  // Use the Upstash Redis URL from the environment variable
  token: process.env.UPSTASH_REDIS_TOKEN,  // Use the Upstash Redis token from the environment variable
});

// Custom Redis Store for session management
class UpstashRedisStore {
  constructor(redisClient) {
    this.client = redisClient;
  }

  async get(id, callback) {
    try {
      const session = await this.client.get(id);
      callback(null, session ? JSON.parse(session) : null);
    } catch (error) {
      callback(error);
    }
  }

  async set(id, session, callback) {
    try {
      await this.client.set(id, JSON.stringify(session));
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  async destroy(id, callback) {
    try {
      await this.client.del(id);
      callback(null);
    } catch (error) {
      callback(error);
    }
  }
}

const app = express();

app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

const config = { 
  authRequired: false,
  auth0Logout: true,
  clientID: process.env.AUTH0_CLIENT_ID,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  baseURL: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
};

// Integrate custom Redis store with auth middleware
app.use(
  auth({
    idpLogout: true,
    backchannelLogout: {
      store: new UpstashRedisStore(redisClient),  // Use the custom Upstash Redis store
    },
  })
);

// Middleware to make the `user` object available for all views
app.use(function (req, res, next) {
  res.locals.user = req.oidc.user;
  next();
});

// Example route to set and get data from Upstash
app.get('/set-data', async (req, res) => {
  await redisClient.set('foo', 'bar');  // Set a key-value pair in Upstash Redis
  const data = await redisClient.get('foo');  // Get the value for the key 'foo'
  res.send(`Data from Upstash: ${data}`);
});

app.use('/', router);

// Catch 404 and forward to error handler
app.use(function (req, res, next) {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// Error handler
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: process.env.NODE_ENV !== 'production' ? err : {},
  });
});

module.exports = app;
