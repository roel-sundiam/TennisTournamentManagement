const express = require('express');
const path = require('path');
const app = express();
const port = 3001;

// Serve static files
app.use(express.static('src'));

// For SPA routing, return index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Simple server running at http://localhost:${port}`);
  console.log(`Network access: http://0.0.0.0:${port}`);
});