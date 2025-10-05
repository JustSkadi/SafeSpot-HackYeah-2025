const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

async function ensureIncidentFilesExist() {
    try {
        const dataDir = path.join(__dirname, 'data');
        await fs.mkdir(dataDir, { recursive: true });
        
        const criminalFile = path.join(dataDir, 'incidents_criminal.json');
        const roadFile = path.join(dataDir, 'incidents_road.json');
        
        await fs.writeFile(criminalFile, JSON.stringify([], null, 2));
        console.log('Cleared criminal incidents file on startup');
        
        await fs.writeFile(roadFile, JSON.stringify([], null, 2));
        console.log('Cleared road incidents file on startup');
        
        console.log('Incident files ready - all data cleared');
    } catch (error) {
        console.error('Error ensuring incident files exist:', error);
    }
}

ensureIncidentFilesExist();

app.post('/api/incidents/:type', async (req, res) => {
    try {
        const type = req.params.type;
        const newIncidents = Array.isArray(req.body) ? req.body : [req.body];
        
        const DATA_FILE = path.join(__dirname, 'data', `incidents_${type}.json`);
        
        await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
        await fs.writeFile(DATA_FILE, JSON.stringify(newIncidents, null, 2));
        
        console.log(`Saved ${newIncidents.length} new ${type} incidents (replaced old data)`);
        
        res.json({ 
            success: true, 
            total: newIncidents.length,
            type: type
        });
    } catch (error) {
        console.error('Error saving incidents:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/incidents/:type', async (req, res) => {
    try {
        const type = req.params.type;
        const DATA_FILE = path.join(__dirname, 'data', `incidents_${type}.json`);
        
        try {
            await fs.access(DATA_FILE);
        } catch {
            await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2));
            console.log(`Created empty ${type} incidents file`);
        }
        
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const incidents = JSON.parse(data);
        res.json(incidents);
    } catch (error) {
        console.log(`Error reading ${req.params.type} incidents:`, error);
        res.json([]);
    }
});

app.delete('/api/incidents/:type', async (req, res) => {
    try {
        const type = req.params.type;
        const DATA_FILE = path.join(__dirname, 'data', `incidents_${type}.json`);
        
        await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2));
        console.log(`All ${type} incidents cleared`);
        res.json({ success: true, message: `All ${type} incidents cleared` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/incidents', async (req, res) => {
    try {
        const criminalFile = path.join(__dirname, 'data', 'incidents_criminal.json');
        const roadFile = path.join(__dirname, 'data', 'incidents_road.json');
        
        await fs.writeFile(criminalFile, JSON.stringify([], null, 2));
        await fs.writeFile(roadFile, JSON.stringify([], null, 2));
        
        console.log('All incidents cleared');
        res.json({ success: true, message: 'All incidents cleared' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// NOWE ENDPOINTY DLA CULTURE
app.post('/api/culture', async (req, res) => {
    try {
        const cultureData = req.body;
        const CULTURE_FILE = path.join(__dirname, 'data', 'culture.json');
        
        await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
        await fs.writeFile(CULTURE_FILE, JSON.stringify(cultureData, null, 2));
        
        console.log('Saved culture data');
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving culture data:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/culture', async (req, res) => {
    try {
        const CULTURE_FILE = path.join(__dirname, 'data', 'culture.json');
        
        try {
            await fs.access(CULTURE_FILE);
        } catch {
            return res.json([]);
        }
        
        const data = await fs.readFile(CULTURE_FILE, 'utf8');
        const cultureData = JSON.parse(data);
        res.json(cultureData);
    } catch (error) {
        console.log('Error reading culture data:', error);
        res.json([]);
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend API running on http://localhost:${PORT}`);
});