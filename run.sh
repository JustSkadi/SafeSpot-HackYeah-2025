#!/bin/bash

# --- Konfiguracja Skryptu ---
project_url="http://localhost:5678" # URL frontendu
api_url="http://localhost:8080"     # URL backendu/API
repo_url="https://github.com/your-username/your-repo-name" # URL repozytorium projektu

# --- Definicje kolorów dla czytelnego outputu ---
# Używamy \033[...m, co jest standardowym kodem ANSI dla kolorów w terminalu.
# -e w poleceniu 'echo' jest potrzebne do interpretacji tych kodów.
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color (reset)

# --- Funkcja pomocnicza do kolorowego logowania ---
# Użycie: write_log "Wiadomość" "$COLOR_VARIABLE"
write_log() {
    local message="$1"
    local color="$2"
    echo -e "${color}${message}${NC}"
}

# --- Główny Skrypt ---
write_log "=========================================" "$CYAN"
write_log "Uruchamianie konfiguracji Interactive Safety Map" "$CYAN"
write_log "=========================================" "$CYAN"
echo "" # Pusta linia dla czytelności

# 1. Sprawdź, czy Docker jest uruchomiony
write_log "[INFO] Sprawdzanie statusu Dockera..." "$GRAY"
# Przekierowujemy standardowe wyjście i błędy do /dev/null, aby ukryć output.
# Sprawdzamy tylko kod wyjścia ($?). 0 oznacza sukces.
if docker info > /dev/null 2>&1; then
    write_log "[SUCCESS] Docker jest zainstalowany i uruchomiony." "$GREEN"
else
    write_log "[WARNING] Nie wykryto działającego Dockera. Proszę go zainstalować." "$YELLOW"
    write_log "[INFO] Postępuj zgodnie z instrukcjami dla Twojego systemu operacyjnego:" "$GRAY"
    
    # Wykrywanie systemu operacyjnego i wyświetlanie odpowiednich instrukcji
    os_type=$(uname -s)
    if [[ "$os_type" == "Linux" ]]; then
        write_log "  - Linux: Użyj menedżera pakietów (np. 'sudo apt-get install docker-ce' lub 'sudo dnf install docker-ce')." "$YELLOW"
        write_log "  - Oficjalny przewodnik: https://docs.docker.com/engine/install/" "$YELLOW"
    elif [[ "$os_type" == "Darwin" ]]; then # Darwin to nazwa jądra macOS
        write_log "  - macOS: Zainstaluj Docker Desktop. Możesz go pobrać ze strony Dockera lub użyć Homebrew:" "$YELLOW"
        write_log "  - brew install --cask docker" "$YELLOW"
    else
        write_log "  - Nieznany system. Pobierz Docker Desktop z oficjalnej strony: https://www.docker.com/products/docker-desktop/" "$YELLOW"
    fi
    
    write_log "[ERROR] Przerwano. Uruchom ten skrypt ponownie po zainstalowaniu i uruchomieniu Dockera." "$RED"
    exit 1
fi

# 2. Uruchom Docker Compose
# Używamy 'docker compose' (nowa składnia) zamiast 'docker-compose'
write_log "\n[INFO] Uruchamianie kontenerów aplikacji za pomocą docker-compose..." "$GRAY"
if docker compose up -d; then
    write_log "[SUCCESS] Kontenery Docker zostały uruchomione w trybie detached." "$GREEN"
else
    write_log "[ERROR] Polecenie 'docker compose up -d' nie powiodło się." "$RED"
    write_log "[ERROR] Sprawdź plik docker-compose.yml i upewnij się, że Docker działa poprawnie." "$RED"
    exit 1
fi

# 3. Otwórz adresy URL w domyślnej przeglądarce
write_log "\n[INFO] Otwieranie zakładek aplikacji w domyślnej przeglądarce..." "$GRAY"

# Wybór polecenia do otwierania URL w zależności od systemu
open_cmd=""
if [[ "$(uname)" == "Linux" ]]; then
    open_cmd="xdg-open"
elif [[ "$(uname)" == "Darwin" ]]; then
    open_cmd="open"
fi

if command -v $open_cmd &> /dev/null; then
    $open_cmd "$project_url"
    $open_cmd "$api_url"
    $open_cmd "$repo_url" # Otwieranie repozytorium jako trzeciej przydatnej karty
else
    write_log "[WARNING] Nie można automatycznie otworzyć przeglądarki. Proszę otworzyć poniższe linki ręcznie:" "$YELLOW"
fi

# Zawsze wyświetlaj podsumowanie, nawet jeśli automatyczne otwieranie się nie powiedzie
echo ""
write_log "========================================================" "$CYAN"
write_log "Konfiguracja zakończona! Twoja aplikacja powinna być dostępna." "$CYAN"
write_log "  - Frontend:    $project_url" "$CYAN"
write_log "  - API/Backend: $api_url" "$CYAN"
write_log "========================================================" "$CYAN"
