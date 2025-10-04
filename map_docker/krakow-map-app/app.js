const Cracow = {
    lat: 50.0647,
    lng: 19.9450
};

// Initialize the map
const map = L.map('map').setView([Cracow.lat, Cracow.lng], 12);

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
}).addTo(map);

//Marker color function (dla incydentów)
function getThreatColor(category) {
    if (category === 'criminal') {
        return 'red';
    } else if (category === 'road accident') {
        return 'orange';
    } else {
        return 'blue'; 
    }
}

// Marker icon function (dla incydentów)
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

// Function to load and process incidents.json data
async function loadIncidents() {
    try {
        const response = await fetch('incidents.json'); 
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const incidents = await response.json(); 

        incidents.forEach(incident => {
            if (incident.latitude && incident.longitude && incident.location) {
                const lat = parseFloat(incident.latitude);
                const lng = parseFloat(incident.longitude);
                const markerColor = getThreatColor(incident.type_of_threat || '');
                const customIcon = createCustomIcon(markerColor);
                const popupContent = `
                    <div style="max-width: 300px;">
                        <h3 style="margin-top: 0; color: #333;">${incident.location}</h3>
                        <p style="margin: 10px 0;"><strong>Danger type:</strong> ${incident.type_of_threat || 'Unknown'}</p>
                        ${incident.date ? `<p style="margin: 10px 0;"><strong>Data:</strong> ${incident.date}</p>` : ''}
                        <p style="margin: 10px 0; text-align: justify;">${incident.summary || 'No description available'}</p>
                        ${incident.url ? `<p style="margin: 10px 0;"><a href="${incident.url}" target="_blank" style="color: #0066cc;">See more →</a></p>` : ''}
                    </div>
                `;
                L.marker([lat, lng], { icon: customIcon })
                    .addTo(map)
                    .bindPopup(popupContent);
            }
        });
        addLegend();
    } catch (error) {
        console.error("Nie udało się wczytać lub przetworzyć pliku incidents.json:", error);
    }
}

// Funkcja dodająca legendę dla incydentów
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
    
    legend.addTo(map);
}

// --- Sekcja kodu do obsługi stref niebezpieczeństwa (ZAKTUALIZOWANA) ---

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

        // ZMIANA: Sortujemy strefy według crime_rate (rosnąco)
        // Dzięki temu zielone (niski crime_rate) będą dodane pierwsze (na dole),
        // a czerwone (wysoki crime_rate) będą dodane ostatnie (na wierzchu)
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
        
        addZoneLegend();

    } catch (error) {
        console.error("Nie udało się wczytać lub przetworzyć pliku dangerzones.json:", error);
    }
}

function addZoneLegend() {
    const legend = L.control({ position: 'bottomleft' });

    legend.onAdd = function (map) {
        const div = L.DomUtil.create('div', 'info legend');
        div.style.backgroundColor = 'white';
        div.style.padding = '10px';
        div.style.border = '2px solid rgba(0,0,0,0.2)';
        div.style.borderRadius = '5px';

        div.innerHTML = `
            <h4 style="margin: 0 0 10px 0;">Crime rate<br>(on 1000 citiziens)</h4>
            <div style="display: flex; align-items: center;"><span style="background-color: red; width: 15px; height: 15px; margin-right: 5px; opacity: 0.7;"></span> >51</div>
            <div style="display: flex; align-items: center;"><span style="background-color: orange; width: 15px; height: 15px; margin-right: 5px; opacity: 0.7;"></span> 41-50</div>
            <div style="display: flex; align-items: center;"><span style="background-color: yellow; width: 15px; height: 15px; margin-right: 5px; opacity: 0.7;"></span> 30-40</div>
            <div style="display: flex; align-items: center;"><span style="background-color: lightgreen; width: 15px; height: 15px; margin-right: 5px; opacity: 0.7;"></span> 21-29</div>
            <div style="display: flex; align-items: center;"><span style="background-color: green; width: 15px; height: 15px; margin-right: 5px; opacity: 0.7;"></span> 0-20</div>
        `;
        return div;
    };

    legend.addTo(map);
}


// --- GŁÓWNE WYWOŁANIA ---
loadIncidents();
loadDangerZones();