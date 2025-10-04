// Kraków coordinates
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

// Add a marker for Kraków
const marker = L.marker([krakow.lat, krakow.lng]).addTo(map);
marker.bindPopup('<b>Kraków</b><br>Main Market Square area').openPopup();

// Add some popular locations in Kraków
const locations = [
    { name: "Main Market Square", lat: 50.0619, lng: 19.9368 },
    { name: "Wawel Castle", lat: 50.0544, lng: 19.9356 },
    { name: "Kazimierz District", lat: 50.0519, lng: 19.9467 }
];

locations.forEach(location => {
    L.marker([location.lat, location.lng])
        .addTo(map)
        .bindPopup(`<b>${location.name}</b><br>dodatkowe info`);
});

// Add a circle around the city center
L.circle([krakow.lat, krakow.lng], {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.1,
    radius: 2000
}).addTo(map);