async function triggerN8nWorkflows(latitude, longitude, placeName) {
    const n8nHost = window.location.hostname;
    const url = `http://${n8nHost}:5678/webhook-test/trigger-criminal-workflow`;
    const url2 = `http://${n8nHost}:5678/webhook-test/trigger-road-workflow`;
    
    const payload = {
        latitude: latitude,
        longitude: longitude,
        location: placeName,
        timestamp: new Date().toISOString()
    };
    try {
        console.log('Triggering n8n workflow for:', placeName);
        console.log('Webhook URL:', url);
        console.log('Payload:', payload);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Raw response from n8n:', data);
        console.log('Response type:', Array.isArray(data) ? 'Array' : typeof data);
        console.log('Response length:', Array.isArray(data) ? data.length : 'N/A');
        let incidents = data;
        
        if (!Array.isArray(data) && data.items) {
            incidents = data.items;
        } else if (!Array.isArray(data) && data.data) {
            incidents = data.data;
        }
        console.log('Processed incidents:', incidents);
        console.log('Incidents count:', Array.isArray(incidents) ? incidents.length : 0);
        if (Array.isArray(incidents) && incidents.length > 0) {
            console.log('Sending to backend:', incidents.length, 'incidents');
            await saveIncidentsToBackend(incidents);
            
            setTimeout(() => reloadIncidents(), 2000);
            
            L.popup()
                .setLatLng([latitude, longitude])
                .setContent(`
                    <div style="text-align: center; padding: 5px;">
                        <strong>Analysis complete!</strong><br>
                        <small>Found ${incidents.length} incidents</small>
                    </div>
                `)
                .openOn(map);
        } else {
            console.log('No incidents found or invalid response');
            L.popup()
                .setLatLng([latitude, longitude])
                .setContent(`
                    <div style="text-align: center; padding: 5px;">
                        <strong>No incidents found</strong><br>
                        <small>Try different location</small>
                    </div>
                `)
                .openOn(map);
        }
        
        return incidents;
        
    } catch (error) {
        console.error('Error triggering workflow:', error);
        
        L.popup()
            .setLatLng([latitude, longitude])
            .setContent(`
                <div style="text-align: center; padding: 5px;">
                    <strong>Analysis failed</strong><br>
                    <small>${error.message}</small>
                </div>
            `)
            .openOn(map);
    }
}

async function saveIncidentsToBackend(incidents) {
    try {
        console.log('Saving to backend - incidents:', incidents);
        console.log('Saving to backend - count:', incidents.length);
        
        const response = await fetch('/api/incidents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(incidents)
        });
        
        const result = await response.json();
        console.log('Backend response:', result);
        
    } catch (error) {
        console.error('Error saving to backend:', error);
    }
}
async function reloadIncidents() {
    try {
        map.eachLayer(layer => {
            if (layer instanceof L.Marker) {
                map.removeLayer(layer);
            }
        });
        
        const response = await fetch('/api/incidents');
        const incidents = await response.json();
        
        console.log('Reloading from backend:', incidents.length, 'incidents');
        
        incidents.forEach(incident => {
            if (incident.latitude && incident.longitude) {
                const markerColor = getThreatColor(incident.type_of_threat || '');
                const customIcon = createCustomIcon(markerColor);
                
                const popupContent = `
                    <div style="max-width: 300px;">
                        <h3 style="margin-top: 0; color: #333;">${incident.location}</h3>
                        <p style="margin: 10px 0;"><strong>Danger type:</strong> ${incident.type_of_threat || 'Unknown'}</p>
                        ${incident.date ? `<p style="margin: 10px 0;"><strong>Date:</strong> ${incident.date}</p>` : ''}
                        <p style="margin: 10px 0; text-align: justify;">${incident.summary || 'No description available'}</p>
                        ${incident.url ? `<p style="margin: 10px 0;"><a href="${incident.url}" target="_blank" style="color: #0066cc;">See more →</a></p>` : ''}
                    </div>
                `;
                
                L.marker([incident.latitude, incident.longitude], { icon: customIcon })
                    .addTo(map)
                    .bindPopup(popupContent);
            }
        });
        
        console.log(`Loaded ${incidents.length} incidents from backend`);
    } catch (error) {
        console.error('Error reloading incidents:', error);
    }
}
async function getCoordinates(placeName) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(placeName)}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.length > 0) {
            return {
                latitude: parseFloat(data[0].lat),
                longitude: parseFloat(data[0].lon)
            };
        }
    } catch (error) {
        console.error('Error fetching coordinates:', error);
    }
    return null;
}

async function searchPlaces() {
    const placeName = document.getElementById('search-input').value.trim();
    if (!placeName) return;

    const coords = await getCoordinates(placeName);
    if (coords) {
        map.setView([coords.latitude, coords.longitude], 15);
        await triggerN8nWorkflows(coords.latitude, coords.longitude, placeName);
        
    } else {
        L.popup()
            .setLatLng(map.getCenter())
            .setContent(`Could not find '${placeName}'`)
            .openOn(map);
    }
}

document.getElementById('search-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        searchPlaces();
    }
});

const Cracow = {
    lat: 50.0647,
    lng: 19.9450
};

const map = L.map('map').setView([Cracow.lat, Cracow.lng], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
}).addTo(map);

function getThreatColor(category) {
    if (category === 'criminal') {
        return 'red';
    } else if (category === 'road accident') {
        return 'orange';
    } else {
        return 'blue'; 
    }
}

function createCustomIcon(color) {
    return L.icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
}

async function loadIncidents() {
    await reloadIncidents();
}
function addLegend() {
    const legend = L.control({ position: 'bottomright' });
    
    legend.onAdd = function (map) {
        const div = L.DomUtil.create('div', 'info legend');
        div.style.backgroundColor = 'white';
        div.style.padding = '10px';
        div.style.border = '2px solid rgba(0,0,0,0.2)';
        div.style.borderRadius = '5px';
        
        div.innerHTML = `
            <h4 style="margin: 0 0 10px 0;">Danger types</h4>
            <div><span style="color: red;">●</span> Criminal</div>
            <div><span style="color: orange;">●</span> Road accident</div>
            <div><span style="color: blue;">●</span> Other</div>
        `;
        
        return div;
    };
    
}

function getZoneColor(crime_rate) {
    if (crime_rate > 51) return 'red';
    if (crime_rate > 40) return 'orange';
    if (crime_rate > 29) return 'yellow';
    if (crime_rate > 20) return 'lightgreen';
    return 'green';
}

async function loadDangerZones() {
    try {
        const response = await fetch('dangerzones.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const zones = await response.json();

        const sortedZones = zones.sort((a, b) => a.crime_rate - b.crime_rate);

        sortedZones.forEach(zone => {
            if (zone.latitude && zone.longitude && zone.crime_rate !== undefined && zone.size) {
                const color = getZoneColor(zone.crime_rate);
                const radius = Math.sqrt((zone.size / Math.PI));

                L.circle([zone.latitude, zone.longitude], {
                    color: 'none',
                    fillColor: color,
                    fillOpacity: 0.4,
                    radius: radius
                }).addTo(map).bindPopup(`
                    <b>District:</b> ${zone.district_name}<br>
                    <b>Crime rate:</b> ${zone.crime_rate}<br>
                `);
            }
        });
    } catch (error) {
        console.error("Error loading danger zones:", error);
    }
}
document.addEventListener('DOMContentLoaded', function() {
    const startButton = document.querySelector('.start-button');
    
    if (startButton) {
        startButton.addEventListener('click', async function(e) {
            e.preventDefault();
            const center = map.getCenter();
            const placeName = 'Current map area';
            this.style.opacity = '0.6';
            this.style.pointerEvents = 'none';
            console.log('Start button clicked');
            await triggerN8nWorkflows(center.lat, center.lng, placeName);
            this.style.opacity = '1';
            this.style.pointerEvents = 'auto';
        });
    }
});

loadIncidents();
loadDangerZones();