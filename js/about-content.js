// =============================================================================
// TREŚĆ OKNA "O PROJEKCIE" — edytuj ten plik aby zaktualizować treść modalu
// =============================================================================

window.ABOUT_CONTENT = {
  version: '2.3.0',
  about: {
    description: 'Aplikacja zegarowa synchronizowana z serwerami NTP Głównego Urzędu Miar (GUM). Zawiera kolekcję stylów zegarów inspirowanych systemami stosowanymi w historii polskiej telewizji i radia.',
    copyright: '© Maksymilian Motyka 2026'
  },
  skins: [
    {
      name: 'Polskie Radio (Favag + Cyfrowy)',
      description: 'Zegar analogowy i cyfrowy Polskiego Radia'
    },
    {
      name: 'Teleexpress (Kropkowy)',
      description: 'Kropkowy zegar z kultowego programu TVP',
      authorUrl: 'https://github.com/qdnl/qdnl.github.io/tree/main/tex',
      authorName: 'qdnl'
    },
    {
      name: 'TVP 1993-2012',
      description: 'Klasyczny zegar TVP'
    },
    {
      name: 'TVP 2012-dziś',
      description: 'Współczesny zegar TVP'
    },
    {
      name: 'TVP Kraków (90s)',
      description: 'Regionalny zegar TVP Kraków'
    }
  ],
  features: [
    'Synchronizacja czasu NTP (dokładność < 1s)',
    'Sygnał GUM – foniczne oznajmienie pełnej godziny (6 pików)',
    'Parametr ?antena=1 – kompensacja opóźnienia FM (~700ms)',
    'Parametr ?gum-test=1 – 30 pików testowych'
  ],
  legal: [
    'Projekt stanowi niekomercyjną implementację inspirowaną oryginalnymi systemami zegarowymi stosowanymi w Polskim Radiu i Telewizji Polskiej. Style zegarów zostały odtworzone na podstawie publicznie dostępnych materiałów archiwalnych.',
    'Projekt nie jest oficjalnie powiązany z Polskim Radiem, TVP ani innymi podmiotami. Wszelkie znaki towarowe i prawa autorskie należą do ich prawowitych właścicieli.',
    'Kod źródłowy projektu udostępniony jest wyłącznie w celach edukacyjnych i hobbystycznych.'
  ],
  changelog: [
    {
      version: '2.3.0',
      items: [
        'W przypadku utraty połączenia z internetem, aplikacja zachowa ostatni pobrany wzorzec czasu, zamiast przeskakiwać na czas systemowy w systemie uytkownika',
      ]
    },
    {
      version: '2.2.0',
      items: [
        'Poprawiono algorytm synchronizacji czasu (korekcja half-RTT opóźnienia sieciowego), eliminując opóźnienia pojawiające się na słabszych komputerach',
        'Ulepszona animacja sekundnika zegara radiowego - bardziej oddająca styl ruchu sekundnika w rzeczywistych zegarach'
      ]
    },
    {
      version: '2.1.0',
      items: [
        'Dodano kontrolki koloru tła dla zegarów: Polskiego Radia, Teleexpressu oraz TVP 1993-2012',
        'Zmieniono kontrolkę logo TVP na bardziej intuicyjną',
        'Naprawiono błąd, który nie pokazywał wskaźnika synchronizacji czasu. Sam wskaźnik od teraz również pulsuje w trakcie synchronizacji',
        'Zegar Teleexpressu wyświetla liczbę sekund (możliwą do wyłączenia w Opcjach)',
        'Dodano system powiadomień o nowych wersjach'
      ]
    }
  ]
};
