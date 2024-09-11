const { Redis } = require('@upstash/redis');

// Initialize the Upstash Redis client
const redisClient = new Redis({
  url: process.env.UPSTASH_REDIS_URL,  // Use the Upstash Redis URL from the environment variable
  token: process.env.UPSTASH_REDIS_TOKEN,  // Use the Upstash Redis token from the environment variable
});

module.exports = redisClient;
