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
// Add this at the top of your app.js file (global variable)
const incidentMarkers = [];

// Modified loadIncidents function
async function loadIncidents() {
    try {
        const response = await fetch('incidents.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const jsonData = await response.json();
        const incidents = jsonData;

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
                        ${incident.date ? `<p style="margin: 10px 0;"><strong>Date:</strong> ${incident.date}</p>` : ''}
                        <p style="margin: 10px 0; text-align: justify;">${incident.summary || 'No description available'}</p>
                        ${incident.url ? `<p style="margin: 10px 0;"><a href="${incident.url}" target="_blank" style="color: #0066cc;">See more →</a></p>` : ''}
                    </div>
                `;

                // Create marker and store it with incident data
                const marker = L.marker([lat, lng], { icon: customIcon })
                    .addTo(map)
                    .bindPopup(popupContent);
                
                // Store marker with its incident type
                incidentMarkers.push({
                    marker: marker,
                    type: incident.type_of_threat || 'other'
                });
            }
        });

        addLegend();

    } catch (error) {
        console.error("Nie udało się wczytać lub przetworzyć pliku incidents.json:", error);
    }
}

// Function to filter markers based on selected types
function filterMarkers(criminalChecked, accidentChecked, othersChecked) {
    // If no filters are selected, show all markers
    const showAll = !criminalChecked && !accidentChecked && !othersChecked;

    incidentMarkers.forEach(item => {
        const typeStr = item.type.toLowerCase();
        let shouldShow = false;

        if (showAll) {
            shouldShow = true;
        } else {
            if (criminalChecked && typeStr.includes('criminal')) shouldShow = true;
            if (accidentChecked && (typeStr.includes('road') || typeStr.includes('accident'))) shouldShow = true;
            if (othersChecked && !typeStr.includes('criminal') && !typeStr.includes('road') && !typeStr.includes('accident')) shouldShow = true;
        }

        // Show or hide the marker
        if (shouldShow) {
            if (!map.hasLayer(item.marker)) {
                map.addLayer(item.marker);
            }
        } else {
            if (map.hasLayer(item.marker)) {
                map.removeLayer(item.marker);
            }
        }
    });
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

// Function to load incidents and populate the list
async function loadIncidentsList() {
    try {
        const response = await fetch('incidents.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const incidents = await response.json();
        
        // Get the incident list container
        const incidentListElement = document.querySelector('.incident-list');
        
        // Clear existing hardcoded items
        incidentListElement.innerHTML = '';
        
        // Check if there are incidents
        if (incidents.length === 0) {
            incidentListElement.innerHTML = '<li class="no-incidents">No incidents reported in this area</li>';
            return;
        }
        
        // Create list items for each incident
        incidents.forEach((incident, index) => {
            const listItem = createIncidentListItem(incident, index);
            incidentListElement.appendChild(listItem);
        });
        
    } catch (error) {
        console.error("Failed to load incidents:", error);
        const incidentListElement = document.querySelector('.incident-list');
        incidentListElement.innerHTML = '<li class="error-message">Failed to load incidents</li>';
    }
}

// Function to create a list item for an incident
function createIncidentListItem(incident, index) {
    const li = document.createElement('li');
    li.className = 'incident-item';
    li.dataset.incidentId = index;
    
    // Create the incident type badge
    const typeBadge = getIncidentTypeBadge(incident.type_of_threat);
    
    // Format the date if available
    const dateStr = incident.date ? formatDate(incident.date) : 'Date unknown';
    
    // Create the HTML structure for the list item
    li.innerHTML = `
        <div class="incident-card">
            <div class="incident-header">
                <span class="incident-type-badge ${typeBadge.class}"> ${incident.type_of_threat || 'Unknown'}</span>
                <span class="incident-date">${dateStr}</span>
            </div>
            <div class="incident-location">
                <span class="material-icons location-icon">location_on</span>
                <span>${incident.location || 'Unknown location'}</span>
            </div>
            <div class="incident-summary">
                ${incident.summary || 'No description available'}
            </div>
            ${incident.url ? `
                <div class="incident-link">
                    <a href="${incident.url}" target="_blank" class="read-more">
                        Read more <span class="material-icons">open_in_new</span>
                    </a>
                </div>
            ` : ''}
        </div>
    `;
    
    // Add click event to center map on incident location
    li.addEventListener('click', function() {
        if (incident.latitude && incident.longitude) {
            // Close the list panel
            document.getElementById('listPanel').classList.remove('active');
            
            // Center map on the incident
            map.setView([incident.latitude, incident.longitude], 16);
            
            // Optional: Open the popup for this incident if you have markers
            // You'd need to store marker references to do this
        }
    });
    
    return li;
}

// Function to get badge styling based on incident type
function getIncidentTypeBadge(type) {
    const typeStr = (type || '').toLowerCase();
    
    if (typeStr.includes('criminal')) {
        return { class: 'badge-criminal'};
    } else if (typeStr.includes('road') || typeStr.includes('accident')) {
        return { class: 'badge-accident'};
    } else {
        return { class: 'badge-other'};
    }
}

// Function to format date
function formatDate(dateString) {
    if (!dateString) return 'Date unknown';
    
    try {
        const date = new Date(dateString);
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    } catch (e) {
        return dateString; // Return original string if parsing fails
    }
}

// Function to filter incidents based on selected types
// Updated filterIncidents function
function filterIncidents() {
    const criminalChecked = document.getElementById('type1').checked;
    const accidentChecked = document.getElementById('type2').checked;
    const othersChecked = document.getElementById('type3').checked;
    
    // Filter list items
    const incidentItems = document.querySelectorAll('.incident-item');
    
    incidentItems.forEach(item => {
        const typeText = item.querySelector('.incident-type-badge').textContent.toLowerCase();
        
        let shouldShow = false;
        
        if (criminalChecked && typeText.includes('criminal')) shouldShow = true;
        if (accidentChecked && (typeText.includes('road') || typeText.includes('accident'))) shouldShow = true;
        if (othersChecked && !typeText.includes('criminal') && !typeText.includes('road') && !typeText.includes('accident')) shouldShow = true;
        
        // If no filters are selected, show all
        if (!criminalChecked && !accidentChecked && !othersChecked) shouldShow = true;
        
        item.style.display = shouldShow ? 'block' : 'none';
    });
    
    // Filter map markers
    filterMarkers(criminalChecked, accidentChecked, othersChecked);
}

// Load incidents when the page loads
document.addEventListener('DOMContentLoaded', function() {
    loadIncidentsList();
    
    // Add event listener for the List button
    const openListBtn = document.getElementById('openListBtn');
    if (openListBtn) {
        openListBtn.addEventListener('click', function(e) {
            e.preventDefault();
            loadIncidentsList(); // Refresh the list when opened
        });
    }
    
    // Add event listener for Apply button in options modal
    const applyBtn = document.getElementById('applyBtn');
    if (applyBtn) {
        applyBtn.addEventListener('click', function() {
            filterIncidents();
            document.getElementById('optionsModal').style.display = 'none';
        });
    }
});

// Function to create a list item for an incident
function createIncidentListItem(incident, index) {
    const li = document.createElement('li');
    li.className = 'incident-item';
    li.dataset.incidentId = index;
    
    // Create the incident type badge
    const typeBadge = getIncidentTypeBadge(incident.type_of_threat);
    
    // Format the date if available
    const dateStr = incident.date ? formatDate(incident.date) : 'Date unknown';
    
    // Determine the card type class
    let cardTypeClass = '';
    const typeStr = (incident.type_of_threat || '').toLowerCase();
    if (typeStr.includes('criminal')) {
        cardTypeClass = 'criminal-type';
    } else if (typeStr.includes('road') || typeStr.includes('accident')) {
        cardTypeClass = 'accident-type';
    } else {
        cardTypeClass = 'other-type';
    }
    
    // Create the HTML structure for the list item
    li.innerHTML = `
        <div class="incident-card ${cardTypeClass}">
            <div class="incident-header">
                <span class="incident-type-badge ${typeBadge.class}">${typeBadge.icon} ${incident.type_of_threat || 'Unknown'}</span>
                <span class="incident-date">${dateStr}</span>
            </div>
            <div class="incident-location">
                <span class="material-icons location-icon">location_on</span>
                <span>${incident.location || 'Unknown location'}</span>
            </div>
            <div class="incident-summary">
                ${incident.summary || 'No description available'}
            </div>
            ${incident.url ? `
                <div class="incident-link">
                    <a href="${incident.url}" target="_blank" class="read-more">
                        Read more <span class="material-icons">open_in_new</span>
                    </a>
                </div>
            ` : ''}
        </div>
    `;
    
    // Add click event to center map on incident location
    li.addEventListener('click', function() {
        if (incident.latitude && incident.longitude) {
            // Close the list panel
            document.getElementById('listPanel').classList.remove('active');
            
            // Center map on the incident
            map.setView([incident.latitude, incident.longitude], 16);
        }
    });
    
    return li;
}

// Updated filterIncidents function
function filterIncidents() {
    const criminalChecked = document.getElementById('type1').checked;
    const accidentChecked = document.getElementById('type2').checked;
    const othersChecked = document.getElementById('type3').checked;
    
    // Filter list items
    const incidentItems = document.querySelectorAll('.incident-item');
    
    incidentItems.forEach(item => {
        const typeText = item.querySelector('.incident-type-badge').textContent.toLowerCase();
        
        let shouldShow = false;
        
        if (criminalChecked && typeText.includes('criminal')) shouldShow = true;
        if (accidentChecked && (typeText.includes('road') || typeText.includes('accident'))) shouldShow = true;
        if (othersChecked && !typeText.includes('criminal') && !typeText.includes('road') && !typeText.includes('accident')) shouldShow = true;
        
        // If no filters are selected, show all
        if (!criminalChecked && !accidentChecked && !othersChecked) shouldShow = true;
        
        item.style.display = shouldShow ? 'block' : 'none';
    });
    
    // Filter map markers
    filterMarkers(criminalChecked, accidentChecked, othersChecked);
}

// Add this to show current filter state when opening options
document.getElementById('openOptionsBtn').addEventListener('click', function() {
    document.getElementById('optionsModal').style.display = 'flex';
});

// Optional: Add a "Reset Filters" button in your modal
function resetFilters() {
    document.getElementById('type1').checked = false;
    document.getElementById('type2').checked = false;
    document.getElementById('type3').checked = false;
    
    // Show all markers
    incidentMarkers.forEach(item => {
        if (!map.hasLayer(item.marker)) {
            map.addLayer(item.marker);
        }
    });
    
    // Show all list items
    const incidentItems = document.querySelectorAll('.incident-item');
    incidentItems.forEach(item => {
        item.style.display = 'block';
    });
}

// Variable to store user location marker
let userLocationMarker = null;

// Function to get and display user's current location
function getCurrentLocation() {
    if ("geolocation" in navigator) {
        // Show loading state (optional)
        const startButton = document.querySelector('.start-button');
        const originalHTML = startButton.innerHTML;
        
        // Temporarily change the icon to show loading
        startButton.querySelector('.material-icons').textContent = 'my_location';
        
        navigator.geolocation.getCurrentPosition(
            // Success callback
            function(position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const accuracy = position.coords.accuracy;
                
                // Center map on user location
                map.setView([lat, lng], 16);
                
                // Remove existing user location marker if it exists
                if (userLocationMarker) {
                    map.removeLayer(userLocationMarker);
                }
                
                // Create custom icon for user location
                const userIcon = L.divIcon({
                    html: '<div class="user-location-marker"><div class="pulse"></div><div class="pin"></div></div>',
                    iconSize: [30, 30],
                    className: 'user-marker-icon'
                });
                
                // Add marker for user location
                userLocationMarker = L.marker([lat, lng], { 
                    icon: userIcon,
                    zIndexOffset: 1000 // Make sure it appears on top
                }).addTo(map);
                
                // Add popup to user marker
                userLocationMarker.bindPopup(`
                    <b>Your Location</b><br>
                    Accuracy: ${Math.round(accuracy)} meters
                `).openPopup();
                
                // Optional: Add accuracy circle
                const accuracyCircle = L.circle([lat, lng], {
                    color: '#4285F4',
                    fillColor: '#4285F4',
                    fillOpacity: 0.15,
                    weight: 1,
                    radius: accuracy
                }).addTo(map);
                
                // Store circle reference to remove it later if needed
                if (userLocationMarker.accuracyCircle) {
                    map.removeLayer(userLocationMarker.accuracyCircle);
                }
                userLocationMarker.accuracyCircle = accuracyCircle;
                
                // Reset button icon
                startButton.querySelector('.material-icons').textContent = 'location_on';
                
                // Show success message (optional)
                showLocationMessage('Location updated successfully', 'success');
            },
            // Error callback
            function(error) {
                let errorMessage = '';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = "Location access denied. Please enable location permissions.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = "Location information unavailable.";
                        break;
                    case error.TIMEOUT:
                        errorMessage = "Location request timed out.";
                        break;
                    default:
                        errorMessage = "An unknown error occurred.";
                        break;
                }
                
                // Show error message
                showLocationMessage(errorMessage, 'error');
                
                // Reset button icon
                startButton.querySelector('.material-icons').textContent = 'location_on';
            },
            // Options
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    } else {
        showLocationMessage('Geolocation is not supported by your browser', 'error');
    }
}

// Function to show location messages
function showLocationMessage(message, type) {
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `location-message ${type}`;
    messageDiv.textContent = message;
    
    // Add to body
    document.querySelector('.mobile-container').appendChild(messageDiv);
    
    // Remove after 3 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// Add event listener to start button
document.addEventListener('DOMContentLoaded', function() {
    const startButton = document.querySelector('.start-button');
    if (startButton) {
        startButton.addEventListener('click', function(e) {
            e.preventDefault();
            getCurrentLocation();
        });
    }
});

// Optional: Get location on page load
// getCurrentLocation();

loadIncidents();
loadDangerZones();