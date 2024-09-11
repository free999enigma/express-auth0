const app = require('../server'); // Adjust the path to point to server.js
const serverless = require('serverless-http');

module.exports = serverless(app); // Export the app wrapped in serverless-http for Vercel
