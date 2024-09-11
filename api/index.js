const app = require('../api/server'); // Adjust the path if needed
const serverless = require('serverless-http');

module.exports = serverless(app);
