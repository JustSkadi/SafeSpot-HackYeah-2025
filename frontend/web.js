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

// Autocomplete dla wyszukiwania
const destinationInput = document.getElementById('search-input');
const suggestionsList = document.getElementById('suggestionsList');
const apiKey = '212971bb0651475ab201273217d3ec3a';
let debounceTimeout;

destinationInput.addEventListener('input', () => {
    const query = destinationInput.value;
    
    clearTimeout(debounceTimeout);

    if (query.length < 3) {
        suggestionsList.innerHTML = '';
        suggestionsList.classList.remove('active');
        return;
    }

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
                            destinationInput.value = feature.properties.formatted;
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
    }, 300);
});

document.addEventListener('click', (event) => {
    if (event.target !== destinationInput) {
        suggestionsList.classList.remove('active');
    }
});