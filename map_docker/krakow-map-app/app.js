// Function to get coordinates from a place name using Nominatim API
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
    return null; // Return null if not found or if there's an error
}

// Function to handle the search
async function searchPlaces() {
    const placeName = document.getElementById('search-input').value.trim();
    if (!placeName) return;

    const coords = await getCoordinates(placeName);
    if (coords) {
        // If coordinates are found, move the map and marker
        map.setView([coords.latitude, coords.longitude], 15);
        mainMarker.setLatLng([coords.latitude, coords.longitude])
            .setPopupContent(`<b>${placeName}</b>`)
            .openPopup();
    } else {
        // If no coordinates are found, show a popup
        L.popup()
            .setLatLng(map.getCenter())
            .setContent(`Could not find '${placeName}'`)
            .openOn(map);
    }
}

// Event listener for the search input (when Enter is pressed)
document.getElementById('search-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        searchPlaces();
    }
});

const Cracow = {
    lat: 50.0647,
    lng: 19.9450
};

// Initialize the map
const map = L.map('map').setView([Cracow.lat, Cracow.lng], 13);

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
}).addTo(map);

// Store circles for updating opacity
const dangerZoneCircles = [];

// Function to calculate opacity based on zoom level
function getOpacityByZoom(zoomLevel) {
    // Zoom levels typically range from 1 to 19
    // At zoom 10 -> opacity 0.5
    // At zoom 15 -> opacity 0.25
    // At zoom 19 -> opacity 0.01
    const minZoom = 10;
    const maxZoom = 19;
    const maxOpacity = 0.325;
    const minOpacity = 0.001;
    
    if (zoomLevel <= minZoom) return maxOpacity;
    if (zoomLevel >= maxZoom) return minOpacity;
    
    // Linear interpolation
    const ratio = (zoomLevel - minZoom) / (maxZoom - minZoom);
    return maxOpacity - (ratio * (maxOpacity - minOpacity));
}

// Update circle opacity when zoom changes
function updateCircleOpacity() {
    const currentZoom = map.getZoom();
    const opacity = getOpacityByZoom(currentZoom);
    
    dangerZoneCircles.forEach(circle => {
        circle.setStyle({ fillOpacity: opacity });
    });
}

// Add zoom event listener
map.on('zoomend', updateCircleOpacity);

//Marker color function
function getThreatColor(category) {
    if (category === 'criminal') {
        return 'red';
    } else if (category === 'road accident') {
        return 'orange';
    } else {
        return 'blue'; 
    }
}

// Marker icon function
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

// Function to load and process JSON data
async function loadIncidents() {
    try {
        const response = await fetch('incidents.json'); // Wczytaj plik JSON
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const jsonData = await response.json(); // Pobierz zawartość jako JSON

        // Przetwarzanie danych JSON
        const incidents = jsonData; // Zakładam, że JSON to tablica obiektów

        incidents.forEach(incident => {
            // Sprawdź, czy mamy wszystkie wymagane pola
            if (incident.latitude && incident.longitude && incident.location) {
                // Konwertuj współrzędne na liczby
                const lat = parseFloat(incident.latitude);
                const lng = parseFloat(incident.longitude);

                // Określ kolor markera na podstawie typu zagrożenia
                const markerColor = getThreatColor(incident.type_of_threat || '');
                const customIcon = createCustomIcon(markerColor);

                // Stwórz zawartość popup
                const popupContent = `
                    <div style="max-width: 300px;">
                        <h3 style="margin-top: 0; color: #333;">${incident.location}</h3>
                        <p style="margin: 10px 0;"><strong>Danger type:</strong> ${incident.type_of_threat || 'Unknown'}</p>
                        ${incident.date ? `<p style="margin: 10px 0;"><strong>Date:</strong> ${incident.date}</p>` : ''}
                        <p style="margin: 10px 0; text-align: justify;">${incident.summary || 'No description available'}</p>
                        ${incident.url ? `<p style="margin: 10px 0;"><a href="${incident.url}" target="_blank" style="color: #0066cc;">See more →</a></p>` : ''}
                    </div>
                `;

                // Dodaj znacznik do mapy
                L.marker([lat, lng], { icon: customIcon })
                    .addTo(map)
                    .bindPopup(popupContent);
            }
        });

        // Dodaj legendę do mapy
        addLegend();

    } catch (error) {
        console.error("Nie udało się wczytać lub przetworzyć pliku incidents.json:", error);
    }
}

// Funkcja dodająca legendę do mapy
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
    
    // legend.addTo(map);
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

        // ZMIANA: Sortujemy strefy według crime_rate (rosnąco)
        // Dzięki temu zielone (niski crime_rate) będą dodane pierwsze (na dole),
        // a czerwone (wysoki crime_rate) będą dodane ostatnie (na wierzchu)
        const sortedZones = zones.sort((a, b) => a.crime_rate - b.crime_rate);

        // Get initial opacity based on current zoom
        const currentZoom = map.getZoom();
        const initialOpacity = getOpacityByZoom(currentZoom);

        sortedZones.forEach(zone => {
            if (zone.latitude && zone.longitude && zone.crime_rate !== undefined && zone.size) {
                const color = getZoneColor(zone.crime_rate);
                
                const radius = Math.sqrt((zone.size / Math.PI));

                const circle = L.circle([zone.latitude, zone.longitude], {
                    color: 'none',
                    fillColor: color,
                    fillOpacity: initialOpacity, // Use dynamic opacity
                    radius: radius
                }).addTo(map).bindPopup(`
                    <b>District:</b> ${zone.district_name}<br>
                    <b>Crime rate:</b> ${zone.crime_rate}<br>
                `);
                
                // Store circle reference for opacity updates
                dangerZoneCircles.push(circle);
            }
        });
        
        // addZoneLegend();

    } catch (error) {
        console.error("Nie udało się wczytać lub przetworzyć pliku dangerzones.json:", error);
    }
}

loadIncidents();
loadDangerZones();