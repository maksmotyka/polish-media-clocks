# Polish Media Clocks

Aplikacja zegarowa synchronizowana z serwerami NTP Głównego Urzędu Miar (GUM). Zawiera kolekcję stylów zegarów inspirowanych systemami stosowanymi w historii polskiej telewizji i radia.

## Funkcje aplikacji

### Synchronizacja czasu NTP
Aplikacja została wyposażona we własny backend API, który komunikuje się z serwerem NTP Głównego Urzędu Miar i Wag (tzw. `Tempus`). W momencie uruchomienia aplikacji odpytuje ona API o dostrojenie się do sygnału czasu przekazywanego przez GUM. API próbuje uzyskać informację najpierw od serwera głównego (`tempus1`). Jeśli to się nie uda, próbuje uzyskać informacje od serwera zapasowego (`tempus2`).

W przypadku niemożliwości połączenia się aplikacji z API lub brakiem informacji od serwerów GUM, aplikacja próbuje uzyskać informacje o wzorcu czasu z publicznie dostępnych usług API (`WorldTimeAPI`).

Gdy wszystkie powyższe metody łączenia zawiodą, aplikacja pobiera czas z tego ustawionego w systemie użytkownika - w przypadku domyślnej konfiguracji systemów operacyjnych będzie to oznaczało dokładność +/- 1 sekundy (biorąc pod uwagę naturalny odchył zegara systemowego i niestałe dostrajanie się do wzorca czasu).

Stan połączenia raportowany jest zarówno poprzez "dymek" widoczny w lewym górnym rogu strony, jak również poprzez konsolę w narzędziach deweloperskich przeglądarki.

### Sygnał foniczny czasu (tzw. "GUM")
Sygnał GUM-u można włączyć poprzez przełącznik w panelu "Opcje". Po włączeniu funkcji, aplikacja będzie ogłaszać pełną godzinę poprzez wyemitowanie fonicznego sygnału czasu o wysokości `940 Hz` składającego się z 6 pików: 5 oznajmiających ostatnie 5 sekund mijającej godziny oraz ostatni, wydłużony sygnał, którego początek oznacza punktualnie nową pełną godzinę.

- `xx:59:55` - `xx:59:59` - Sygnał o długości 100ms
- `xx+1:00:00` - Sygnał o długości 300ms

Aplikacja emituje podobną sekwencję sygnału czasu również w momencie upłynięcia połowy godziny, tzn. w zakresie `xx:29:55` - `xx:30:00`.

### Dostępne parametry adresowe
`antena=1` - przesuwa dźwięk GUM-u o ok. 700ms - 1 sekundę do przodu / kompensacja opóźnienia FM - pełna godzina anonsowana jest dłuższym pikiem o godz `~xx:59:59.300`. Jest to mechanizm stosowany w Polskim Radiu - dzięki takiemu przesunięciu słuchacz odbierający rozgłośnię poprzez FM usłyszy pik o pełnej godzinie.

`gum-test=1` - aktywacja pików testowych - Zegar po zaznaczeniu opcji GUM wydaje również 30 pików kontrolnych: od `xx:59:15` do `xx:59:45` oraz od `xx:29:15` do `xx:29:45`.

### Panel "O projekcie"
Aplikacja zawiera wbudowany panel informacyjny dostępny z menu "Opcje". Panel zawiera:
- Numer wersji aplikacji
- Opis wszystkich dostępnych stylów zegarów
- Listę funkcji i parametrów
- Informacje o prawach autorskich i licencji

### Progressive Web App (PWA)
Aplikacja jest skonfigurowana jako PWA i może być zainstalowana na urządzeniu jako samodzielna aplikacja:
- Na urządzeniach mobilnych: użyj opcji "Dodaj do ekranu głównego"
- W przeglądarkach Chrome/Edge: kliknij ikonę instalacji w pasku adresu
- Działa w trybie standalone (pełny ekran bez paska przeglądarki)

## Dostępne style zegarów

### 1. Polskie Radio (Favag + Cyfrowy)
Zegar analogowy i cyfrowy wzorowany na systemach Polskiego Radia:
- **Zegar analogowy** - wzorowany na tarczy czasomierza Favag Impulse Broadcast, używanego w budynkach Polskiego Radia do wskazywania czasu. Zegary te sterowane są impulsowo poprzez centralę ustalającą puls.
- **Zegar cyfrowy** - wzorowany na tablicach LED wyświetlających godzinę, używanych w budynkach rozgłośni jako zapasowy system wskazywania czasu w przypadku awarii systemu analogowego.
- Możliwość wyświetlania osobno lub razem
- Płynna animacja wskazówek z ease-out - odwzorowanie zachowania wskazówek na fizycznym zegarze

### 2. Teleexpress (Kropkowy)
Zegar w stylu ze scenografii programu TVP Teleexpress:
- 60 kropek sekundowych rozmieszczonych wokół tarczy
- Cyfrowy wyświetlacz w centrum (HH:MM)
- Kropki w formie 7-segmentowego wyświetlacza
- Czarne tło

Motyw ten został pierwotnie stworzony przez uytkownika [qdnl](https://github.com/qdnl/qdnl.github.io/tree/main/tex).

### 3. TVP 1993-2012
Klasyczny zegar TVP z lat 90. i 2000.:
- Niebieskie tło `rgb(0, 32, 197)`
- Tarcza analogowa z wskazówkami
- Opcja ukrycia logo TVP (przełącznik "Ukryj logo") - odwzorowanie działania zegara w pierwszych latach po rebrandingu TVP w 2003 r. 

### 4. TVP 2012-dziś
Współczesny zegar TVP:
- Tło z obrazem
- Zmodernizowana tarcza

### 5. TVP Kraków (90s)
Regionalny zegar TVP Kraków z lat 90. (przed uruchomieniem TVP3):
- Niebieskie tło `rgb(0, 32, 197)`
- Unikalna grafika tarczy regionalnej odwzorowana na podstawie zachowanych nagrań

## Architektura modularna

Projekt jest podzielony na niezależne moduły:

### Struktura plików

```
polish-media-clocks/
├── index.html                         # Główny plik HTML
├── manifest.json                      # Manifest PWA
├── css/
│   ├── common.css                     # Wspólne style (tła, kontrolki)
│   └── skins/
│       ├── classic.css                # Style zegara Polskiego Radia
│       ├── teleexpress.css            # Style zegara Teleexpressu
│       ├── tvp-1993.css               # Style TVP 1993-2012
│       ├── tvp-2012.css               # Style TVP 2012-dziś
│       └── tvp-krakow.css             # Style TVP Kraków
├── js/
│   ├── ntp-sync.js                    # Moduł synchronizacji NTP
│   ├── clock-manager.js               # Zarządzanie zegarami i UI
│   └── skins/
│       ├── classic-clock.js           # Logika zegara Polskiego Radia
│       ├── teleexpress-clock.js       # Logika zegara Teleexpressu
│       ├── tvp-1993-clock.js          # Logika TVP 1993-2012
│       ├── tvp-2012-clock.js          # Logika TVP 2012-dziś
│       └── tvp-krakow-clock.js        # Logika TVP Kraków
├── clock-assets/                      # WSZYSTKIE zasoby zegarów (obrazy)
│   ├── classic/                       # Zegar klasyczny PR
│   ├── tvp-1993/                      # TVP 1993-2012
│   ├── tvp-2012/                      # TVP 2012-dziś
│   └── tvp-krakow/                    # TVP Kraków
└── fonts/                             # Czcionki (DigiClock)
```

### Moduły

**NTPSync (js/ntp-sync.js)**
- Synchronizacja czasu z serwerami GUM
- Obsługa serwerów zapasowych
- Automatyczna resynchronizacja
- Detekcja skoków czasu

**ClockManager (js/clock-manager.js)**
- Zarządzanie zegarami i ich zmianą
- Dynamiczne ładowanie stylów CSS
- Obsługa kontrolek i GUM
- Wyświetlanie statusu synchronizacji

**Skórki zegarów (js/skins/)**
- Każda skórka to osobna klasa
- Wspólny interfejs dla łatwej wymiany
- Możliwość dodawania nowych stylów bez modyfikacji istniejącego kodu

## [Uruchom zegar](https://maksmotyka.github.io/polish-media-clocks/)
