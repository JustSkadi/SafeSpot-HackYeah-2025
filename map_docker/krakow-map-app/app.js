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
marker.bindPopup('<b>Kraków</b><br>Centrum miasta').openPopup();

// Add a circle around the city center
L.circle([krakow.lat, krakow.lng], {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.1,
    radius: 2000
}).addTo(map);

// --- POCZĄTEK NOWEGO KODU ---

// Funkcja do parsowania linii CSV z obsługą cudzysłowów
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    // Dodaj ostatnie pole
    result.push(current.trim());
    
    return result;
}

// Funkcja do określenia koloru markera na podstawie typu zagrożenia
function getThreatColor(threatType) {
    if (threatType.includes('Kradzież') || threatType.includes('Kieszonkowcy')) {
        return 'red';
    } else if (threatType.includes('Wandalizm') || threatType.includes('Niszczenie')) {
        return 'orange';
    } else if (threatType.includes('Zakłócanie') || threatType.includes('Agresywne')) {
        return 'yellow';
    } else {
        return 'blue';
    }
}

// Funkcja do tworzenia niestandardowej ikony markera
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

// Function to load and process CSV data
async function loadIncidents() {
    try {
        const response = await fetch('incidents.csv'); // Wczytaj plik
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvData = await response.text(); // Pobierz zawartość jako tekst

        // Przetwarzanie danych CSV
        const lines = csvData.trim().split('\n'); // Podziel na linie
        const header = lines.shift(); // Usuń i zignoruj pierwszą linię (nagłówek)

        lines.forEach(line => {
            // Pomiń puste linie
            if (line.trim() === '') return;

            // Parsuj linię CSV
            const fields = parseCSVLine(line);
            
            // Rozpakuj pola
            const [latitude, longitude, location, summary, articleUrl, threatType] = fields;

            // Sprawdź, czy mamy wszystkie wymagane pola
            if (latitude && longitude && location) {
                // Konwertuj współrzędne na liczby
                const lat = parseFloat(latitude);
                const lng = parseFloat(longitude);

                // Określ kolor markera na podstawie typu zagrożenia
                const markerColor = getThreatColor(threatType || '');
                const customIcon = createCustomIcon(markerColor);

                // Stwórz zawartość popup
                const popupContent = `
                    <div style="max-width: 300px;">
                        <h3 style="margin-top: 0; color: #333;">${location}</h3>
                        <p style="margin: 10px 0;"><strong>Danger type:</strong> ${threatType || 'Nieznany'}</p>
                        <p style="margin: 10px 0; text-align: justify;">${summary || 'Brak opisu'}</p>
                        ${articleUrl ? `<p style="margin: 10px 0;"><a href="${articleUrl}" target="_blank" style="color: #0066cc;">Read more →</a></p>` : ''}
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
        console.error("Nie udało się wczytać lub przetworzyć pliku incidents.csv:", error);
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
            <h4 style="margin: 0 0 10px 0;">Typy zagrożeń</h4>
            <div><span style="color: red;">●</span> Kradzież / Kieszonkowcy</div>
            <div><span style="color: orange;">●</span> Wandalizm / Niszczenie mienia</div>
            <div><span style="color: gold;">●</span> Zakłócanie porządku</div>
            <div><span style="color: blue;">●</span> Inne</div>
        `;
        
        return div;
    };
    
    legend.addTo(map);
}

// Wywołaj funkcję wczytującą dane
loadIncidents();

// --- KONIEC NOWEGO KODU --- 