const app = require('./server.js'); // Adjust the path if needed
const serverless = require('serverless-http');

module.exports = serverless(app);
