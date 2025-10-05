function getSelectedFilters() {
    const filters = {
        criminal: document.getElementById('type1')?.checked || false,
        roadAccidents: document.getElementById('type2')?.checked || false,
        others: document.getElementById('type3')?.checked || false
    };
    return filters;
}

async function triggerN8nWorkflows(latitude, longitude, placeName) {
    const n8nHost = window.location.hostname;
    const criminalUrl = `http://${n8nHost}:5678/webhook-test/trigger-criminal-workflow`;
    const roadUrl = `http://${n8nHost}:5678/webhook-test/trigger-road-workflow`;
    
    const payload = {
        latitude: latitude,
        longitude: longitude,
        location: placeName,
        timestamp: new Date().toISOString()
    };

    const filters = getSelectedFilters();
    const shouldRunCriminal = filters.criminal || (!filters.criminal && !filters.roadAccidents && !filters.others);
    const shouldRunRoad = filters.roadAccidents || (!filters.criminal && !filters.roadAccidents && !filters.others);

    console.log('Selected filters:', filters);
    console.log('Running workflows - Criminal:', shouldRunCriminal, 'Road:', shouldRunRoad);
    
    // Twórz tablicę Promise'ów - każdy workflow działa niezależnie
    const workflowPromises = [];
    
    if (shouldRunCriminal) {
        const criminalPromise = fetch(criminalUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(response => {
            if (!response.ok) throw new Error(`Criminal: HTTP ${response.status}`);
            return response.json();
        })
        .then(data => {
            console.log('Criminal workflow finished:', data);
            let incidents = Array.isArray(data) ? data : (data.items || data.data || []);
            return { type: 'criminal', incidents };
        })
        .catch(error => {
            console.error('Error in criminal workflow:', error);
            return { type: 'criminal', incidents: [], error: error.message };
        });
        
        workflowPromises.push(criminalPromise);
    }
    
    if (shouldRunRoad) {
        const roadPromise = fetch(roadUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(response => {
            if (!response.ok) throw new Error(`Road: HTTP ${response.status}`);
            return response.json();
        })
        .then(data => {
            console.log('Road workflow finished:', data);
            let incidents = Array.isArray(data) ? data : (data.items || data.data || []);
            return { type: 'road', incidents };
        })
        .catch(error => {
            console.error('Error in road workflow:', error);
            return { type: 'road', incidents: [], error: error.message };
        });
        
        workflowPromises.push(roadPromise);
    }
    
    // Czekaj aż WSZYSTKIE workflow'y się skończą (lub zfailują)
    const results = await Promise.allSettled(workflowPromises);
    
    let allIncidents = [];
    
    // Przetwórz wyniki
    for (const result of results) {
        if (result.status === 'fulfilled' && result.value.incidents.length > 0) {
            console.log(`Saving ${result.value.type} incidents:`, result.value.incidents.length);
            await saveIncidentsToBackend(result.value.incidents, result.value.type);
            allIncidents = allIncidents.concat(result.value.incidents);
        }
    }
    
    // Pokaż wynik
    setTimeout(() => reloadIncidents(), 2000);
    
    if (allIncidents.length > 0) {
        L.popup()
            .setLatLng([latitude, longitude])
            .setContent(`
                <div style="text-align: center; padding: 5px;">
                    <strong>Analysis complete!</strong><br>
                    <small>Found ${allIncidents.length} incidents</small>
                </div>
            `)
            .openOn(map);
    } else {
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
    
    return allIncidents;
}

async function saveIncidentsToBackend(incidents, type) {
    try {
        console.log(`Saving to backend - ${type} incidents:`, incidents);
        console.log(`Saving to backend - count:`, incidents.length);
        
        const response = await fetch(`/api/incidents/${type}`, {
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
        
        const filters = getSelectedFilters();
        const shouldLoadCriminal = filters.criminal || (!filters.criminal && !filters.roadAccidents && !filters.others);
        const shouldLoadRoad = filters.roadAccidents || (!filters.criminal && !filters.roadAccidents && !filters.others);
        
        let allIncidents = [];
        
        if (shouldLoadCriminal) {
            try {
                const response = await fetch('/api/incidents/criminal');
                const incidents = await response.json();
                console.log('Reloading criminal incidents from backend:', incidents.length);
                allIncidents = allIncidents.concat(incidents);
            } catch (error) {
                console.log('No criminal incidents file found');
            }
        }
        
        if (shouldLoadRoad) {
            try {
                const response = await fetch('/api/incidents/road');
                const incidents = await response.json();
                console.log('Reloading road incidents from backend:', incidents.length);
                allIncidents = allIncidents.concat(incidents);
            } catch (error) {
                console.log('No road incidents file found');
            }
        }
        
        allIncidents.forEach(incident => {
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
        
        console.log(`Loaded ${allIncidents.length} total incidents from backend`);
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

document.getElementById('searchBtn').addEventListener('click', function(e) {
    e.preventDefault();
    searchPlaces();
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