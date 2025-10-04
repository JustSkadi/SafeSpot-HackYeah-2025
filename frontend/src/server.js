const express = require('express');
const path = require('path');
const app = express();

app.use(express.static('build'));
app.get('/api/incidents.csv', (req, res) => {
  res.sendFile('/app/data/incidents.csv');
});

app.listen(3000);