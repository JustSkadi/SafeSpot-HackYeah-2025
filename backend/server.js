const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'incidents.json');

app.use(cors());
app.use(express.json());
app.post('/api/incidents', async (req, res) => {
    try {
        const newIncidents = Array.isArray(req.body) ? req.body : [req.body];
        await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
        await fs.writeFile(DATA_FILE, JSON.stringify(newIncidents, null, 2));
        
        console.log(`Saved ${newIncidents.length} new incidents (replaced old data)`);
        
        res.json({ 
            success: true, 
            total: newIncidents.length 
        });
    } catch (error) {
        console.error('Error saving incidents:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/incidents', async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const incidents = JSON.parse(data);
        res.json(incidents);
    } catch (error) {
        console.log('No incidents file found, returning empty array');
        res.json([]);
    }
});

app.delete('/api/incidents', async (req, res) => {
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2));
        console.log('All incidents cleared');
        res.json({ success: true, message: 'All incidents cleared' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend API running on http://localhost:${PORT}`);
});