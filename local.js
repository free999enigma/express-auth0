const app = require('./server'); // Make sure the path points to server.js

// Set the port for local development
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running locally at http://localhost:${port}`);
});
