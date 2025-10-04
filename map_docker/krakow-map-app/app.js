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

// --- Map Initialization ---

// Default coordinates for Kraków
const krakow = {
    lat: 50.0647,
    lng: 19.9450
};

// Initialize the map
const map = L.map('map').setView([krakow.lat, krakow.lng], 13);

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
}).addTo(map);

// Add a main, movable marker
const mainMarker = L.marker([krakow.lat, krakow.lng]).addTo(map);
mainMarker.bindPopup('<b>Kraków</b><br>You can search for other places.').openPopup();

// Add a circle around the city center
L.circle([krakow.lat, krakow.lng], {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.1,
    radius: 2000
}).addTo(map);

// Add some popular fixed locations in Kraków
const locations = [
    { name: "Main Market Square", lat: 50.0619, lng: 19.9368 },
    { name: "Wawel Castle", lat: 50.0544, lng: 19.9356 },
    { name: "Kazimierz District", lat: 50.0519, lng: 19.9467 }
];

locations.forEach(location => {
    L.marker([location.lat, location.lng])
        .addTo(map)
        .bindPopup(`<b>${location.name}</b>`);
});

// Event listener for the search input (when Enter is pressed)
document.getElementById('search-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        searchPlaces();
    }
});