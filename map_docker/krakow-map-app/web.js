// --- Options Modal Logic ---
const optionsModal = document.getElementById('optionsModal');
const openOptionsBtn = document.getElementById('openOptionsBtn');
const closeOptionsBtn = document.getElementById('closeOptionsBtn');
const applyBtn = document.getElementById('applyBtn');

openOptionsBtn.addEventListener('click', () => { optionsModal.style.display = 'flex'; });
closeOptionsBtn.addEventListener('click', () => { optionsModal.style.display = 'none'; });
window.addEventListener('click', (event) => { if (event.target === optionsModal) { optionsModal.style.display = 'none'; } });
applyBtn.addEventListener('click', () => {
    const selectedOptions = Array.from(document.querySelectorAll('#optionsModal input:checked')).map(cb => cb.value);
    alert(selectedOptions.length > 0 ? 'Applied options: ' + selectedOptions.join(', ') : 'No special options applied.');
    optionsModal.style.display = 'none';
});

// --- List Panel Logic ---
const listPanel = document.getElementById('listPanel');
const openListBtn = document.getElementById('openListBtn');
const mapBtn = document.getElementById('mapBtn');

const openListPanel = (event) => {
    event.preventDefault(); 
    listPanel.classList.add('active');
    openListBtn.classList.remove('active'); 
    mapBtn.classList.add('active');
};
const closeListPanel = (event) => {
    event.preventDefault();
    listPanel.classList.remove('active');
    mapBtn.classList.remove('active'); 
    openListBtn.classList.add('active');
};

openListBtn.addEventListener('click', openListPanel);
mapBtn.addEventListener('click', closeListPanel);

// --- AUTOSUGGEST LOGIC WITH API ---
const searchInput = document.getElementById('search-input'); // Changed from destinationInput
const suggestionsList = document.getElementById('suggestionsList');
const apiKey = '212971bb0651475ab201273217d3ec3a';
let debounceTimeout;

searchInput.addEventListener('input', () => {
    const query = searchInput.value;
    
    // Clear the previous timeout
    clearTimeout(debounceTimeout);

    if (query.length < 3) {
        suggestionsList.innerHTML = '';
        suggestionsList.classList.remove('active');
        return;
    }

    // Set a new timeout to fetch suggestions after 300ms of inactivity
    debounceTimeout = setTimeout(() => {
        const apiUrl = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&apiKey=${apiKey}`;

        fetch(apiUrl)
            .then(response => response.json())
            .then(data => {
                suggestionsList.innerHTML = '';
                if (data.features && data.features.length > 0) {
                    data.features.forEach(feature => {
                        const li = document.createElement('li');
                        li.textContent = feature.properties.formatted;
                        li.addEventListener('click', () => {
                            searchInput.value = feature.properties.formatted;
                            suggestionsList.classList.remove('active');
                            suggestionsList.innerHTML = '';
                        });
                        suggestionsList.appendChild(li);
                    });
                    suggestionsList.classList.add('active');
                } else {
                    suggestionsList.classList.remove('active');
                }
            })
            .catch(error => {
                console.error('Error fetching suggestions:', error);
                suggestionsList.classList.remove('active');
            });
    }, 300); // Debounce delay
});

document.addEventListener('click', (event) => {
    if (event.target !== searchInput) {
        suggestionsList.classList.remove('active');
    }
});