// Global variables
let map;
let favorites = JSON.parse(localStorage.getItem('favoritePlaces')) || [];
let searchMarkers = [];
let favoriteMarkers = {};
let currentLocation = null;
let touristIntensityCache = {};

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initMap();
    updateFavoritesList();
    updateFavoritesBadge();
    
    // Add enter key listener for search
    document.getElementById('search-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchPlaces();
        }
    });
});

// Initialize Leaflet map
function initMap() {
    map = L.map('map').setView([40.7128, -74.0060], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    // Get user's location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            currentLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            map.setView([currentLocation.lat, currentLocation.lng], 13);
            
            L.circleMarker([currentLocation.lat, currentLocation.lng], {
                radius: 8,
                fillColor: "#4299e1",
                color: "#fff",
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(map).bindPopup('📍 Your current location');
        });
    }

    loadFavoritesOnMap();
}

// Search for places
async function searchPlaces() {
    const query = document.getElementById('search-input').value.trim();
    if (!query) {
        showNotification('Please enter a search term', 'warning');
        return;
    }

    showLoading(true);
    clearSearchMarkers();

    try {
        const bounds = map.getBounds();
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&bounded=1&viewbox=${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}&limit=20&addressdetails=1&extratags=1`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.length === 0) {
            showNotification('No places found', 'info');
        } else {
            displaySearchResults(data);
            addSearchMarkersToMap(data);
        }
    } catch (error) {
        console.error('Search error:', error);
        showNotification('Error searching places', 'error');
    } finally {
        showLoading(false);
    }
}

// Calculate tourist intensity for a place
async function calculateTouristIntensity(lat, lon, placeData) {
    const cacheKey = `${lat}_${lon}`;
    
    if (touristIntensityCache[cacheKey]) {
        return touristIntensityCache[cacheKey];
    }

    try {
        // Use Overpass API to get nearby tourist infrastructure
        const radius = 1000; // 1km radius
        const overpassUrl = 'https://overpass-api.de/api/interpreter';
        
        const query = `
            [out:json][timeout:25];
            (
                node["tourism"](around:${radius},${lat},${lon});
                node["amenity"~"restaurant|cafe|bar"](around:${radius},${lat},${lon});
                node["shop"](around:${radius},${lat},${lon});
                node["historic"](around:${radius},${lat},${lon});
                way["tourism"](around:${radius},${lat},${lon});
                way["amenity"~"restaurant|cafe|bar"](around:${radius},${lat},${lon});
                way["historic"](around:${radius},${lat},${lon});
            );
            out count;
        `;

        const response = await fetch(overpassUrl, {
            method: 'POST',
            body: `data=${encodeURIComponent(query)}`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const data = await response.json();
        
        // Count different types of tourist infrastructure
        let touristAttractions = 0;
        let restaurants = 0;
        let hotels = 0;
        let shops = 0;
        let historicSites = 0;

        // Parse the response to count elements
        if (data.elements) {
            data.elements.forEach(element => {
                if (element.tags) {
                    if (element.tags.tourism) {
                        if (element.tags.tourism === 'hotel' || element.tags.tourism === 'motel') {
                            hotels++;
                        } else {
                            touristAttractions++;
                        }
                    }
                    if (element.tags.amenity && (element.tags.amenity === 'restaurant' || element.tags.amenity === 'cafe' || element.tags.amenity === 'bar')) {
                        restaurants++;
                    }
                    if (element.tags.shop) {
                        shops++;
                    }
                    if (element.tags.historic) {
                        historicSites++;
                    }
                }
            });
        }

        // Calculate intensity score
        const totalCount = data.elements ? data.elements.length : 0;
        let intensityScore = 0;
        let intensityLevel = 'low';
        
        // Weighted scoring
        intensityScore = (touristAttractions * 3) + (restaurants * 1.5) + (hotels * 2) + (shops * 0.5) + (historicSites * 2.5);
        
        if (intensityScore > 100) {
            intensityLevel = 'very_high';
        } else if (intensityScore > 50) {
            intensityLevel = 'high';
        } else if (intensityScore > 20) {
            intensityLevel = 'medium';
        } else {
            intensityLevel = 'low';
        }

        const result = {
            score: intensityScore,
            level: intensityLevel,
            details: {
                touristAttractions,
                restaurants,
                hotels,
                shops,
                historicSites,
                totalPOIs: totalCount
            },
            bestTimeToVisit: getBestTimeToVisit(intensityLevel),
            tips: getTouristTips(intensityLevel)
        };

        touristIntensityCache[cacheKey] = result;
        return result;

    } catch (error) {
        console.error('Error calculating tourist intensity:', error);
        return {
            score: 0,
            level: 'unknown',
            details: {
                touristAttractions: 0,
                restaurants: 0,
                hotels: 0,
                shops: 0,
                historicSites: 0,
                totalPOIs: 0
            },
            error: true
        };
    }
}

// Get best time to visit based on intensity
function getBestTimeToVisit(intensityLevel) {
    const times = {
        very_high: 'Early morning (6-9 AM) or late evening (after 7 PM)',
        high: 'Weekday mornings or late afternoons',
        medium: 'Mid-morning or mid-afternoon on weekdays',
        low: 'Any time - this area is not typically crowded',
        unknown: 'Unable to determine best time'
    };
    return times[intensityLevel] || times.unknown;
}

// Get tourist tips based on intensity
function getTouristTips(intensityLevel) {
    const tips = {
        very_high: [
            'Book tickets in advance if possible',
            'Arrive early to avoid crowds',
            'Consider visiting during off-season',
            'Be prepared for longer wait times'
        ],
        high: [
            'Visit during weekdays if possible',
            'Avoid peak lunch and dinner hours',
            'Consider guided tours to skip lines'
        ],
        medium: [
            'Popular but manageable crowds',
            'Good photo opportunities throughout the day',
            'Restaurant reservations recommended'
        ],
        low: [
            'Hidden gem - enjoy the peaceful atmosphere',
            'Great for relaxed exploration',
            'Local authentic experience'
        ],
        unknown: []
    };
    return tips[intensityLevel] || tips.unknown;
}

// Show place details with tourist intensity
async function showPlaceDetails(placeData, index) {
    const modal = document.getElementById('place-details-modal');
    const modalLoading = document.getElementById('modal-loading');
    const modalDetails = document.getElementById('modal-details');
    
    modal.classList.add('active');
    modalLoading.style.display = 'block';
    modalDetails.style.display = 'none';
    
    // Calculate tourist intensity
    const intensity = await calculateTouristIntensity(placeData.lat, placeData.lon, placeData);
    
    // Prepare modal content
    const placeType = getPlaceType(placeData);
    const icon = getPlaceIcon(placeType);
    const isFavorite = favorites.some(f => f.osm_id === placeData.osm_id);
    
    const intensityColors = {
        very_high: '#8b0000',
        high: '#e74c3c',
        medium: '#f39c12',
        low: '#27ae60',
        unknown: '#95a5a6'
    };
    
    const intensityLabels = {
        very_high: 'Very High',
        high: 'High',
        medium: 'Medium',
        low: 'Low',
        unknown: 'Unknown'
    };
    
    modalDetails.innerHTML = `
        <div class="place-header">
            <h2>${icon} ${placeData.display_name.split(',')[0]}</h2>
            <span class="place-type-badge">${placeType}</span>
        </div>
        
        <div class="tourist-intensity">
            <h3><i class="fas fa-users"></i> Tourist Intensity Analysis</h3>
            
            <div class="intensity-meter">
                <div class="intensity-bar intensity-${intensity.level}" style="width: ${Math.min(intensity.score, 100)}%">
                    ${intensityLabels[intensity.level]}
                </div>
            </div>
            
            <div class="intensity-factors">
                <div class="factor-item">
                    <div class="factor-icon">🏛️</div>
                    <div class="factor-details">
                        <div class="factor-label">Tourist Attractions</div>
                        <div class="factor-value">${intensity.details.touristAttractions}</div>
                    </div>
                </div>
                <div class="factor-item">
                    <div class="factor-icon">🍽️</div>
                    <div class="factor-details">
                        <div class="factor-label">Restaurants & Cafes</div>
                        <div class="factor-value">${intensity.details.restaurants}</div>
                    </div>
                </div>
                <div class="factor-item">
                    <div class="factor-icon">🏨</div>
                    <div class="factor-details">
                        <div class="factor-label">Hotels</div>
                        <div class="factor-value">${intensity.details.hotels}</div>
                    </div>
                </div>
                <div class="factor-item">
                    <div class="factor-icon">🏛️</div>
                    <div class="factor-details">
                        <div class="factor-label">Historic Sites</div>
                        <div class="factor-value">${intensity.details.historicSites}</div>
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 1rem;">
                <strong>Best Time to Visit:</strong> ${intensity.bestTimeToVisit}
            </div>
        </div>
        
        ${intensity.tips.length > 0 ? `
            <div class="tourist-tips">
                <h4><i class="fas fa-lightbulb"></i> Tips for Visiting</h4>
                <ul>
                    ${intensity.tips.map(tip => `<li>${tip}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
        
        <div style="margin-top: 1.5rem;">
            <p><strong>Address:</strong> ${getShortAddress(placeData)}</p>
            <p><strong>Coordinates:</strong> ${parseFloat(placeData.lat).toFixed(6)}, ${parseFloat(placeData.lon).toFixed(6)}</p>
        </div>
        
        <div style="margin-top: 1.5rem; display: flex; gap: 1rem;">
            <button class="btn-add-favorite ${isFavorite ? 'added' : ''}" 
                    onclick="toggleFavoriteWithIntensity(${index}, '${intensity.level}')"
                    style="flex: 1; padding: 0.8rem; border: none; border-radius: 8px; cursor: pointer;">
                <i class="fas fa-heart"></i> ${isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            </button>
            <button onclick="viewOnMap(${placeData.lat}, ${placeData.lon}, 17); closePlaceDetails();"
                    style="flex: 1; padding: 0.8rem; border: none; border-radius: 8px; cursor: pointer; background-color: #4299e1; color: white;">
                <i class="fas fa-map-marker-alt"></i> View on Map
            </button>
        </div>
    `;
    
    modalLoading.style.display = 'none';
    modalDetails.style.display = 'block';
    
    // Store intensity data with the place
    placeData.touristIntensity = intensity;
}

// Close place details modal
function closePlaceDetails() {
    document.getElementById('place-details-modal').classList.remove('active');
}

// Display search results
function displaySearchResults(results) {
    const resultsPanel = document.getElementById('search-results');
    const resultsList = document.getElementById('results-list');
    
    resultsList.innerHTML = '';
    
    results.forEach((place, index) => {
        const placeType = getPlaceType(place);
        const icon = getPlaceIcon(placeType);
        const isFavorite = favorites.some(f => f.osm_id === place.osm_id);
        
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        resultItem.innerHTML = `
            <h4>${icon} ${place.display_name.split(',')[0]}</h4>
            <span class="result-type">${placeType}</span>
            <p class="result-address">${getShortAddress(place)}</p>
            <div class="result-actions">
                <button class="btn-details" onclick="showPlaceDetails(searchResults[${index}], ${index})">
                    <i class="fas fa-info-circle"></i> Details & Intensity
                </button>
                <button class="btn-add-favorite ${isFavorite ? 'added' : ''}" 
                        onclick="toggleFavorite(${index})"
                        id="fav-btn-${place.osm_id}">
                    <i class="fas fa-heart"></i> ${isFavorite ? 'Added' : 'Favorite'}
                </button>
            </div>
        `;
        
        resultsList.appendChild(resultItem);
    });
    
    resultsPanel.classList.add('active');
    window.searchResults = results;
}

// Toggle favorite with intensity data
async function toggleFavoriteWithIntensity(index, intensityLevel) {
    const place = window.searchResults[index];
    const existingIndex = favorites.findIndex(f => f.osm_id === place.osm_id);
    
    if (existingIndex > -1) {
        removeFavorite(existingIndex);
    } else {
        // Add intensity data before saving
        if (!place.touristIntensity) {
            place.touristIntensity = await calculateTouristIntensity(place.lat, place.lon, place);
        }
        addToFavorites(place);
    }
    
    // Refresh the modal
    showPlaceDetails(place, index);
}

// Add to favorites with tourist intensity
function addToFavorites(place) {
    const favorite = {
        id: Date.now(),
        osm_id: place.osm_id,
        name: place.display_name.split(',')[0],
        fullAddress: place.display_name,
        shortAddress: getShortAddress(place),
        lat: parseFloat(place.lat),
        lng: parseFloat(place.lon),
        type: getPlaceType(place),
        touristIntensity: place.touristIntensity || { level: 'unknown', score: 0 },
        addedDate: new Date().toISOString()
    };
    
    favorites.push(favorite);
    localStorage.setItem('favoritePlaces', JSON.stringify(favorites));
    
    updateFavoritesList();
    updateFavoritesBadge();
    addFavoriteMarkerToMap(favorite);
    
    const btn = document.getElementById(`fav-btn-${place.osm_id}`);
    if (btn) {
        btn.classList.add('added');
        btn.innerHTML = '<i class="fas fa-heart"></i> Added';
    }
    
    showNotification(`${favorite.name} added to favorites!`, 'success');
}

// Add favorite marker with intensity color
function addFavoriteMarkerToMap(favorite) {
    const intensityColors = {
        very_high: '#8b0000',
        high: '#e74c3c',
        medium: '#f39c12',
        low: '#27ae60',
        unknown: '#95a5a6'
    };
    
    const color = intensityColors[favorite.touristIntensity?.level] || intensityColors.unknown;
    const icon = getPlaceIcon(favorite.type);
    
    const marker = L.marker([favorite.lat, favorite.lng], {
        icon: createCustomIcon(icon, color)
    }).addTo(map);
    
    const intensityLabel = favorite.touristIntensity?.level ? 
        favorite.touristIntensity.level.replace('_', ' ').toUpperCase() : 'UNKNOWN';
    
    marker.bindPopup(`
        <strong>${icon} ${favorite.name}</strong><br>
        <small>${favorite.shortAddress}</small><br>
        <small>⭐ Favorite Place</small><br>
        <small>Tourist Intensity: ${intensityLabel}</small>
    `);
    
    favoriteMarkers[favorite.id] = marker;
}

// Update favorites list with intensity badges
function updateFavoritesList(filterType = 'all') {
    const listContainer = document.getElementById('favorites-list');
    const emptyState = document.getElementById('empty-state');
    
    let filteredFavorites = favorites;
    if (filterType !== 'all') {
        filteredFavorites = favorites.filter(f => f.touristIntensity?.level === filterType);
    }
    
    if (filteredFavorites.length === 0) {
        listContainer.style.display = 'none';
        emptyState.style.display = 'block';
    } else {
        listContainer.style.display = 'grid';
        emptyState.style.display = 'none';
        
        listContainer.innerHTML = filteredFavorites.map(favorite => {
            const icon = getPlaceIcon(favorite.type);
            const date = new Date(favorite.addedDate).toLocaleDateString();
            const intensityLevel = favorite.touristIntensity?.level || 'unknown';
            const intensityLabel = intensityLevel.replace('_', ' ');
            
            return `
                <div class="favorite-card">
                    <div class="favorite-card-header">
                        <h3>${icon} ${favorite.name}</h3>
                        <span class="intensity-badge ${intensityLevel.replace('_', '-')}">
                            ${intensityLabel.toUpperCase()}
                        </span>
                    </div>
                    <div class="favorite-card-body">
                        <p class="favorite-address">${favorite.shortAddress}</p>
                        <div class="favorite-meta">
                            <span>Added: ${date}</span>
                        </div>
                        ${favorite.touristIntensity?.bestTimeToVisit ? `
                            <p style="margin-top: 0.5rem; font-size: 0.9rem; color: #666;">
                                <strong>Best time:</strong> ${favorite.touristIntensity.bestTimeToVisit}
                            </p>
                        ` : ''}
                        <div class="favorite-actions" style="margin-top: 1rem;">
                            <button class="btn-view" onclick="viewFavoriteOnMap(${favorite.id})">
                                <i class="fas fa-map"></i> View
                            </button>
                            <button class="btn-directions" onclick="getDirections(${favorite.lat}, ${favorite.lng})">
                                <i class="fas fa-directions"></i> Route
                            </button>
                            <button class="btn-delete" onclick="deleteFavorite(${favorite.id})">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

// Helper functions
function getPlaceType(place) {
    const type = place.type?.toLowerCase() || '';
    const classType = place.class?.toLowerCase() || '';
    
    if (type.includes('museum') || classType.includes('museum')) return 'museum';
    if (type.includes('park') || classType.includes('park')) return 'park';
    if (type.includes('restaurant') || classType.includes('restaurant')) return 'restaurant';
    if (type.includes('cafe') || classType.includes('cafe')) return 'cafe';
    if (type.includes('hotel') || classType.includes('hotel')) return 'hotel';
    if (type.includes('monument') || classType.includes('monument')) return 'monument';
    if (type.includes('attraction') || classType.includes('attraction')) return 'attraction';
    
    return 'place';
}

function getPlaceIcon(type) {
    const icons = {
        museum: '🏛️',
        park: '🌳',
        restaurant: '🍽️',
        cafe: '☕',
        hotel: '🏨',
        monument: '🗿',
        attraction: '📸',
        place: '📍'
    };
    return icons[type] || icons.place;
}

function getShortAddress(place) {
    const parts = place.display_name.split(',');
    return parts.slice(1, 3).join(', ');
}

function createCustomIcon(emoji, color) {
    return L.divIcon({
        html: `<div class="custom-marker" style="background-color: ${color}">${emoji}</div>`,
        className: '',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });
}

// Other functions (unchanged)
function searchCategory(category) {
    document.getElementById('search-input').value = category;
    searchPlaces();
}

function searchNearby() {
    if (!currentLocation) {
        showNotification('Location not available', 'warning');
        return;
    }
    document.getElementById('search-input').value = 'tourist attractions near me';
    searchPlaces();
}

function toggleFavorite(index) {
    const place = window.searchResults[index];
    const existingIndex = favorites.findIndex(f => f.osm_id === place.osm_id);
    
    if (existingIndex > -1) {
        removeFavorite(existingIndex);
    } else {
        // Calculate intensity before adding
        calculateTouristIntensity(place.lat, place.lon, place).then(intensity => {
            place.touristIntensity = intensity;
            addToFavorites(place);
        });
    }
}

function removeFavorite(index) {
    const favorite = favorites[index];
    favorites.splice(index, 1);
    localStorage.setItem('favoritePlaces', JSON.stringify(favorites));
    
    if (favoriteMarkers[favorite.id]) {
        map.removeLayer(favoriteMarkers[favorite.id]);
        delete favoriteMarkers[favorite.id];
    }
    
    updateFavoritesList();
    updateFavoritesBadge();
    
    const btn = document.getElementById(`fav-btn-${favorite.osm_id}`);
    if (btn) {
        btn.classList.remove('added');
        btn.innerHTML = '<i class="fas fa-heart"></i> Favorite';
    }
    
    showNotification(`${favorite.name} removed from favorites`, 'info');
}

function deleteFavorite(id) {
    const index = favorites.findIndex(f => f.id === id);
    if (index > -1 && confirm('Remove this place from favorites?')) {
        removeFavorite(index);
    }
}

function clearSearchMarkers() {
    searchMarkers.forEach(marker => map.removeLayer(marker));
    searchMarkers = [];
}

function addSearchMarkersToMap(places) {
    places.forEach(place => {
        const icon = getPlaceIcon(getPlaceType(place));
        const marker = L.marker([place.lat, place.lon], {
            icon: createCustomIcon(icon, '#667eea')
        }).addTo(map);
        
        marker.bindPopup(`
            <strong>${icon} ${place.display_name.split(',')[0]}</strong><br>
            <small>${getShortAddress(place)}</small>
        `);
        
        searchMarkers.push(marker);
    });
    
    if (places.length > 0) {
        const group = new L.featureGroup(searchMarkers);
        map.fitBounds(group.getBounds().pad(0.1));
    }
}

function loadFavoritesOnMap() {
    favorites.forEach(favorite => {
        addFavoriteMarkerToMap(favorite);
    });
}

function viewFavoriteOnMap(id) {
    const favorite = favorites.find(f => f.id === id);
    if (favorite) {
        showPage('map-page');
        viewOnMap(favorite.lat, favorite.lng, 17);
        
        if (favoriteMarkers[id]) {
            setTimeout(() => {
                favoriteMarkers[id].openPopup();
            }, 500);
        }
    }
}

function viewOnMap(lat, lng, zoom = 17) {
    map.setView([lat, lng], zoom);
}

function getDirections(lat, lng) {
    const url = `https://www.openstreetmap.org/directions?to=${lat},${lng}`;
    window.open(url, '_blank');
}

function filterFavorites() {
    const filterValue = document.getElementById('filter-category').value;
    updateFavoritesList(filterValue);
}

function updateFavoritesBadge() {
    const badge = document.getElementById('favorites-badge');
    badge.textContent = favorites.length;
    badge.style.display = favorites.length > 0 ? 'inline-block' : 'none';
}

function exportFavorites() {
    if (favorites.length === 0) {
        showNotification('No favorites to export', 'warning');
        return;
    }
    
    const dataStr = JSON.stringify(favorites, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportName = `favorite-places-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportName);
    linkElement.click();
    
    showNotification('Favorites exported!', 'success');
}

function closeSearchResults() {
    document.getElementById('search-results').classList.remove('active');
    clearSearchMarkers();
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    document.getElementById(pageId).classList.add('active');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (pageId === 'map-page') {
        document.querySelectorAll('.nav-btn')[0].classList.add('active');
        setTimeout(() => map.invalidateSize(), 100);
    } else {
        document.querySelectorAll('.nav-btn')[1].classList.add('active');
    }
}

function showLoading(show) {
    const loading = document.getElementById('loading');
    loading.classList.toggle('active', show);
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.2);
        z-index: 2000;
        animation: slideUp 0.3s ease;
    `;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
        ${message}
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 3000);
}