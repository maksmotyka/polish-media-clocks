// =============================================================================
// MODUŁ ZARZĄDZANIA ZEGARAMI I WYBORU SKÓREK
// =============================================================================

class ClockManager {
    constructor() {
        this.ntpSync = null;
        this.currentClock = null;
        this.currentSkin = 'classic';
        this.audioCtx = null;
        this.lastPipSecond = -1;

        this.skins = {
            classic: {
                name: 'Polskie Radio (Favag + Cyfrowy)',
                cssFile: 'css/skins/classic.css',
                class: ClassicClock,
                hasAnalogOption: true,
                hasDigitalOption: true
            },
            teleexpress: {
                name: 'Teleexpress (Kropkowy)',
                cssFile: 'css/skins/teleexpress.css',
                class: TeleexpressClock,
                hasAnalogOption: false,
                hasDigitalOption: false
            },
            'tvp-1993': {
                name: 'TVP 1993-2012',
                cssFile: 'css/skins/tvp-1993.css',
                class: TVP1993Clock,
                hasAnalogOption: false,
                hasDigitalOption: false,
                hasLogoOption: true
            },
            'tvp-2012': {
                name: 'TVP 2012-dziś',
                cssFile: 'css/skins/tvp-2012.css',
                class: TVP2012Clock,
                hasAnalogOption: false,
                hasDigitalOption: false
            },
            'tvp-krakow': {
                name: 'TVP Kraków (90s)',
                cssFile: 'css/skins/tvp-krakow.css',
                class: TVPKrakowClock,
                hasAnalogOption: false,
                hasDigitalOption: false
            }
        };

        this.urlParams = new URLSearchParams(window.location.search);
        this.antenaEnabled = this.urlParams.get('antena') === '1';
        this.testEnabled = this.urlParams.get('gum-test') === '1';
    }

    async init() {
        // Inicjalizacja AudioContext
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioContext();

        // Pobranie zapisanej skórki z localStorage
        const savedSkin = localStorage.getItem('clock-skin');
        if (savedSkin && this.skins[savedSkin]) {
            this.currentSkin = savedSkin;
        }

        // Ustaw klasę body dla obecnej skórki
        document.body.classList.add(`skin-${this.currentSkin}`);

        // Załaduj CSS dla obecnej skórki
        this.loadSkinCSS(this.currentSkin);

        // Inicjalizacja synchronizacji NTP
        this.ntpSync = new NTPSync();
        this.ntpSync.onSync((status, isResync) => {
            this.updateSyncStatus(status, isResync);
        });

        // Renderowanie interfejsu kontrolnego
        this.renderControls();

        // Synchronizacja czasu
        await this.ntpSync.initializeTimeSync(false);

        // Uruchomienie zegara (switchSkin już załadował CSS)
        const container = document.getElementById('clocks-container');
        const ClockClass = this.skins[this.currentSkin].class;
        this.currentClock = new ClockClass(this.ntpSync);
        this.currentClock.init(container);

        // Aktualizuj widoczność kontrolek
        this.updateControlsVisibility();

        // Aktualizuj layout
        this.updateLayout();

        // Włączenie audio przy pierwszym kliknięciu
        document.body.addEventListener('click', () => {
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }
        }, { once: true });

        // Start monitorowania pipsów
        this.startPipsMonitoring();

        // Nasłuchiwanie zmian rozmiaru okna
        window.addEventListener('resize', () => {
            this.updateLayout();
        });
    }

    loadSkinCSS(skinName) {
        // Usuń poprzedni CSS skórki
        const oldLink = document.getElementById('skin-css');
        if (oldLink) {
            oldLink.remove();
        }

        // Dodaj nowy CSS z cache-busting
        const link = document.createElement('link');
        link.id = 'skin-css';
        link.rel = 'stylesheet';
        // Dodaj timestamp do URL żeby wymusić przeładowanie (omija cache przeglądarki)
        link.href = this.skins[skinName].cssFile + '?v=' + Date.now();
        document.head.appendChild(link);
    }

    switchSkin(skinName) {
        if (!this.skins[skinName]) {
            console.error(`Nieznana skórka: ${skinName}`);
            return;
        }

        // Zniszcz poprzedni zegar
        if (this.currentClock) {
            this.currentClock.destroy();
        }

        // Usuń poprzednią klasę skórki z body
        document.body.className = document.body.className.replace(/skin-\S+/g, '').trim();

        // Dodaj nową klasę skórki do body
        document.body.classList.add(`skin-${skinName}`);

        // Zmień CSS
        this.loadSkinCSS(skinName);

        // Utwórz nowy zegar
        const container = document.getElementById('clocks-container');
        const ClockClass = this.skins[skinName].class;
        this.currentClock = new ClockClass(this.ntpSync);
        this.currentClock.init(container);

        this.currentSkin = skinName;
        localStorage.setItem('clock-skin', skinName);

        // Aktualizuj widoczność kontrolek
        this.updateControlsVisibility();

        // Aktualizuj layout
        this.updateLayout();
    }

    renderControls() {
        // Sprawdź czy przyciski już istnieją
        let toggleButton = document.getElementById('controls-toggle');
        let controlsDiv = document.getElementById('controls');

        if (!toggleButton) {
            toggleButton = document.createElement('button');
            toggleButton.id = 'controls-toggle';
            toggleButton.textContent = 'Opcje ⚙️';
            document.body.appendChild(toggleButton);

            // Event listener dla przycisku
            toggleButton.addEventListener('click', () => {
                const controls = document.getElementById('controls');
                if (controls) {
                    controls.classList.toggle('hidden');
                }
            });
        }

        if (!controlsDiv) return;

        // Lista skórek
        let skinsOptions = '';
        for (const [key, skin] of Object.entries(this.skins)) {
            const selected = key === this.currentSkin ? 'selected' : '';
            skinsOptions += `<option value="${key}" ${selected}>${skin.name}</option>`;
        }

        controlsDiv.innerHTML = `
            <label>
                <strong>Wybierz styl zegara:</strong>
                <select id="skin-selector">
                    ${skinsOptions}
                </select>
            </label>
            <div id="classic-controls" style="margin-top: 10px;">
                <label><input type="checkbox" id="show-analog" checked> Analogowy</label>
                <label><input type="checkbox" id="show-digital" checked> Cyfrowy</label>
            </div>
            <div id="tvp1993-controls" style="margin-top: 10px;">
                <label><input type="checkbox" id="hide-logo"> Ukryj logo</label>
            </div>
            <hr style="border-color: rgba(255,255,255,0.3); margin: 10px 0;">
            <label><input type="checkbox" id="enable-pips"> GUM</label>
            <label><input type="checkbox" id="show-status"> Pokaż status wzorca czasu</label>
            <hr style="border-color: rgba(255,255,255,0.3); margin: 10px 0;">
            <div style="display: flex; gap: 8px;">
                <button id="refresh-ntp" style="flex: 1; padding: 8px; cursor: pointer;">Odśwież ⟳</button>
                <button id="about-button" style="flex: 1; padding: 8px; cursor: pointer;">O projekcie ℹ️</button>
            </div>
        `;

        // Domyślnie ukryj panel
        controlsDiv.classList.add('hidden');

        // Event listeners
        document.getElementById('skin-selector').addEventListener('change', (e) => {
            this.switchSkin(e.target.value);
        });

        const analogCheckbox = document.getElementById('show-analog');
        const digitalCheckbox = document.getElementById('show-digital');

        if (analogCheckbox) {
            analogCheckbox.addEventListener('change', () => this.updateLayout());
        }

        if (digitalCheckbox) {
            digitalCheckbox.addEventListener('change', () => this.updateLayout());
        }

        const hideLogoCheckbox = document.getElementById('hide-logo');
        if (hideLogoCheckbox) {
            hideLogoCheckbox.addEventListener('change', () => this.updateLayout());
        }

        document.getElementById('show-status').addEventListener('change', () => {
            this.toggleStatusVisibility();
        });

        document.getElementById('refresh-ntp').addEventListener('click', () => {
            this.refreshNTPConnection();
        });

        document.getElementById('about-button').addEventListener('click', () => {
            this.showAbout();
        });
    }

    updateControlsVisibility() {
        const classicControls = document.getElementById('classic-controls');
        const tvp1993Controls = document.getElementById('tvp1993-controls');
        const skin = this.skins[this.currentSkin];

        if (classicControls) {
            classicControls.style.display = skin.hasAnalogOption || skin.hasDigitalOption ? 'block' : 'none';
        }

        if (tvp1993Controls) {
            tvp1993Controls.style.display = skin.hasLogoOption ? 'block' : 'none';
        }
    }

    updateLayout() {
        if (!this.currentClock || !this.currentClock.updateLayout) return;

        const showAnalog = document.getElementById('show-analog')?.checked ?? true;
        const showDigital = document.getElementById('show-digital')?.checked ?? true;
        const hideLogo = document.getElementById('hide-logo')?.checked ?? false;

        this.currentClock.updateLayout(showAnalog, showDigital, hideLogo);
    }

    updateSyncStatus(status, isResync) {
        let statusDiv = document.getElementById('sync-status');
        if (!statusDiv) {
            statusDiv = document.createElement('div');
            statusDiv.id = 'sync-status';
            document.body.appendChild(statusDiv);
        }

        if (isResync) {
            statusDiv.classList.remove('hidden');
            statusDiv.classList.add('syncing');
            statusDiv.innerHTML = '🔄 <strong>Synchronizuję...</strong>';
        }

        const statusIcons = {
            'ntp-primary': '🟢',
            'ntp-backup': '🟡',
            'fallback': '🟠',
            'system': '🔴'
        };

        const statusLabels = {
            'ntp-primary': 'GUM (tempus1)',
            'ntp-backup': 'GUM (tempus2)',
            'fallback': 'Serwer zapasowy',
            'system': 'Czas systemowy'
        };

        const icon = statusIcons[status.timeSourceUsed] || '⚪';
        const label = statusLabels[status.timeSourceUsed] || 'Nieznany';
        const offsetText = status.timeOffset !== 0
            ? ` | Offset: ${status.timeOffset > 0 ? '+' : ''}${status.timeOffset}ms`
            : '';

        statusDiv.innerHTML = `${icon} <strong>${label}</strong><br>
                               <small>${status.ntpServerUsed}${offsetText}</small>`;

        statusDiv.classList.remove('syncing');

        const showStatusCheckbox = document.getElementById('show-status');
        if (showStatusCheckbox && !showStatusCheckbox.checked &&
            (status.timeSourceUsed === 'ntp-primary' || status.timeSourceUsed === 'ntp-backup')) {
            setTimeout(() => {
                statusDiv.classList.add('hidden');
            }, 2000);
        }
    }

    toggleStatusVisibility() {
        const statusDiv = document.getElementById('sync-status');
        const showStatusCheckbox = document.getElementById('show-status');

        if (statusDiv && showStatusCheckbox) {
            if (showStatusCheckbox.checked) {
                statusDiv.classList.remove('hidden');
            } else {
                const status = this.ntpSync.getSyncStatus();
                if (status.timeSourceUsed === 'ntp-primary' || status.timeSourceUsed === 'ntp-backup') {
                    statusDiv.classList.add('hidden');
                }
            }
        }
    }

    playPip(duration = 0.1, timeOffset = 0) {
        const pipsCheckbox = document.getElementById('enable-pips');
        if (!pipsCheckbox || !pipsCheckbox.checked) return;

        const oscillator = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(940, this.audioCtx.currentTime + timeOffset);
        gainNode.gain.setValueAtTime(1, this.audioCtx.currentTime + timeOffset);

        oscillator.connect(gainNode).connect(this.audioCtx.destination);
        oscillator.start(this.audioCtx.currentTime + timeOffset);
        oscillator.stop(this.audioCtx.currentTime + timeOffset + duration);
    }

    checkForPips() {
        const pipsCheckbox = document.getElementById('enable-pips');
        if (!pipsCheckbox || !pipsCheckbox.checked) return;

        let now = this.ntpSync.getSyncedTime();

        if (this.antenaEnabled) {
            now = new Date(now.getTime() + 700);
        }

        const seconds = now.getSeconds();
        const minutes = now.getMinutes();
        const millis = now.getMilliseconds();

        if (seconds === this.lastPipSecond) return;

        if (minutes == 59 && seconds >= 55 && seconds <= 59 && millis < 150) {
            this.playPip(0.1);
            this.lastPipSecond = seconds;
        } else if (minutes == 0 && seconds === 0 && millis < 150) {
            this.playPip(0.3);
            this.lastPipSecond = seconds;
        } else if (minutes == 29 && seconds >= 55 && seconds <= 59 && millis < 150) {
            this.playPip(0.1);
            this.lastPipSecond = seconds;
        } else if (minutes == 30 && seconds === 0 && millis < 150) {
            this.playPip(0.3);
            this.lastPipSecond = seconds;
        }

        if (this.testEnabled) {
            if (minutes == 29 && seconds >= 15 && seconds <= 45 && millis < 150) {
                this.playPip(0.1);
                this.lastPipSecond = seconds;
            } else if (minutes == 59 && seconds >= 15 && seconds <= 45 && millis < 150) {
                this.playPip(0.1);
                this.lastPipSecond = seconds;
            }
        }
    }

    startPipsMonitoring() {
        setInterval(() => {
            this.checkForPips();
        }, 100);
    }

    async refreshNTPConnection() {
        // Wywołaj resynchronizację NTP
        await this.ntpSync.initializeTimeSync(true);
    }

    showAbout() {
        // Utwórz overlay
        const overlay = document.createElement('div');
        overlay.id = 'about-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(5px);
        `;

        // Utwórz modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white;
            padding: 30px;
            border-radius: 15px;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            font-family: system-ui, -apple-system, sans-serif;
        `;

        modal.innerHTML = `
            <h2 style="margin-top: 0; text-align: center; font-size: 24px;">
                🕰️ Polish Media Clocks
            </h2>

            <div style="text-align: center; margin: 15px 0; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 8px;">
                <strong>Wersja:</strong> 2.0.0
            </div>

            <h3 style="font-size: 18px; margin-top: 20px; border-bottom: 2px solid rgba(255,255,255,0.3); padding-bottom: 5px;">
                O projekcie
            </h3>
            <p style="line-height: 1.6;">
                Aplikacja zegarowa synchronizowana z serwerami NTP Głównego Urzędu Miar (GUM).
                Zawiera kolekcję stylów zegarów inspirowanych systemami stosowanymi w historii
                polskiej telewizji i radia.
            </p>

            <h3 style="font-size: 18px; margin-top: 20px; border-bottom: 2px solid rgba(255,255,255,0.3); padding-bottom: 5px;">
                Dostępne style
            </h3>
            <ul style="line-height: 1.8;">
                <li><strong>Polskie Radio (Favag + Cyfrowy)</strong> - Zegar analogowy i cyfrowy Polskiego Radia</li>
                <li><strong>Teleexpress (Kropkowy)</strong> - Kropkowy zegar z kultowego programu TVP</li>
                <li><strong>TVP 1993-2012</strong> - Klasyczny zegar TVP z charakterystyczną animacją elastic</li>
                <li><strong>TVP 2012-dziś</strong> - Współczesny zegar TVP</li>
                <li><strong>TVP Kraków (90s)</strong> - Regionalny zegar TVP Kraków</li>
            </ul>

            <h3 style="font-size: 18px; margin-top: 20px; border-bottom: 2px solid rgba(255,255,255,0.3); padding-bottom: 5px;">
                Funkcje
            </h3>
            <ul style="line-height: 1.8;">
                <li>Synchronizacja czasu NTP (dokładność &lt; 1s)</li>
                <li>Sygnał GUM - foniczne oznajmienie pełnej godziny (6 pików)</li>
                <li>Parametr <code>?antena=1</code> - kompensacja opóźnienia FM (~700ms)</li>
                <li>Parametr <code>?gum-test=1</code> - 30 pików testowych</li>
            </ul>

            <h3 style="font-size: 18px; margin-top: 20px; border-bottom: 2px solid rgba(255,255,255,0.3); padding-bottom: 5px;">
                Prawa autorskie i licencja
            </h3>
            <p style="line-height: 1.6; font-size: 14px;">
                Projekt stanowi niekomercyjną implementację inspirowaną oryginalnymi systemami
                zegarowymi stosowanymi w Polskim Radiu i Telewizji Polskiej. Style zegarów zostały
                odtworzone na podstawie publicznie dostępnych materiałów archiwalnych.
            </p>
            <p style="line-height: 1.6; font-size: 14px;">
                Projekt nie jest oficjalnie powiązany z Polskim Radiem, TVP ani innymi podmiotami.
                Wszelkie znaki towarowe i prawa autorskie należą do ich prawowitych właścicieli.
            </p>
            <p style="line-height: 1.6; font-size: 14px;">
                Kod źródłowy projektu udostępniony jest wyłącznie w celach edukacyjnych i hobbystycznych.
            </p>

            <div style="text-align: center; margin-top: 25px;">
                <button id="close-about" style="
                    padding: 12px 30px;
                    font-size: 16px;
                    background-color: rgba(255,255,255,0.2);
                    color: white;
                    border: 2px solid white;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.3s;
                ">
                    Zamknij
                </button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Event listeners do zamykania
        document.getElementById('close-about').addEventListener('click', () => {
            overlay.remove();
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });

        // Zamknij na ESC
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        // Hover effect dla przycisku
        const closeBtn = document.getElementById('close-about');
        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.backgroundColor = 'rgba(255,255,255,0.3)';
        });
        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.backgroundColor = 'rgba(255,255,255,0.2)';
        });
    }
}

// Export dla użycia w innych modułach
if (typeof window !== 'undefined') {
    window.ClockManager = ClockManager;
}
