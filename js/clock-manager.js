// =============================================================================
// MODUŁ ZARZĄDZANIA ZEGARAMI I WYBORU SKÓREK
// =============================================================================

class ClockManager {
    constructor() {
        this.VERSION = null;
        this.aboutContent = null;
        this.ntpSync = null;
        this.currentClock = null;
        this.currentSkin = 'classic';
        this.audioCtx = null;
        this.lastPipSecond = -1;
        this.audioPrimed = false;

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
                hasDigitalOption: false,
                hasBackgroundOption: true
            },
            'tvp-1993': {
                name: 'TVP 1993-2012',
                cssFile: 'css/skins/tvp-1993.css',
                class: TVP1993Clock,
                hasAnalogOption: false,
                hasDigitalOption: false,
                hasLogoOption: true,
                hasBackgroundOption: true
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

        // Załaduj treść okna "O projekcie" i ustal wersję aplikacji
        await this.loadAboutContent();

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

        // Sprawdź wersję i pokaż powiadomienie jeśli nowa
        this.checkVersion();

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

        // Resetuj inline style tła (usuń customowe ustawienia z poprzedniej skórki)
        document.body.style.backgroundImage = '';
        document.body.style.backgroundColor = '';

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
                <hr style="border-color: rgba(255,255,255,0.3); margin: 10px 0;">
                <label><input type="checkbox" id="enable-background" checked> Tło</label>
                <label id="background-color-label" style="margin-top: 10px; display: none; align-items: center; gap: 10px;">
                    <span>Kolor tła:</span>
                    <input type="color" id="background-color" value="#000000" style="width: 60px; height: 30px; cursor: pointer; border: 1px solid rgba(255,255,255,0.3); border-radius: 3px;">
                </label>
            </div>
            <div id="tvp1993-controls" style="margin-top: 10px;">
                <label><input type="checkbox" id="show-logo" checked> Logo</label>
                <hr style="border-color: rgba(255,255,255,0.3); margin: 10px 0;">
                <label><input type="checkbox" id="tvp1993-enable-background" checked> Predefiniowane tło</label>
                <label id="tvp1993-background-color-label" style="margin-top: 10px; display: none; align-items: center; gap: 10px;">
                    <span>Kolor tła:</span>
                    <input type="color" id="tvp1993-background-color" value="#0020c5" style="width: 60px; height: 30px; cursor: pointer; border: 1px solid rgba(255,255,255,0.3); border-radius: 3px;">
                </label>
                <button id="tvp1993-reset-bg" style="margin-top: 10px; padding: 8px; cursor: pointer; width: 100%; display: none;">Resetuj ustawienia tła</button>
            </div>
            <div id="teleexpress-controls" style="margin-top: 10px;">
                <label><input type="checkbox" id="show-seconds" checked> Sekundy</label>
                <hr style="border-color: rgba(255,255,255,0.3); margin: 10px 0;">
                <label><input type="checkbox" id="teleexpress-enable-background" checked> Predefiniowane tło</label>
                <label id="teleexpress-background-color-label" style="margin-top: 10px; display: none; align-items: center; gap: 10px;">
                    <span>Kolor tła:</span>
                    <input type="color" id="teleexpress-background-color" value="#000000" style="width: 60px; height: 30px; cursor: pointer; border: 1px solid rgba(255,255,255,0.3); border-radius: 3px;">
                </label>
                <button id="teleexpress-reset-bg" style="margin-top: 10px; padding: 8px; cursor: pointer; width: 100%; display: none;">Resetuj ustawienia tła</button>
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

        const showLogoCheckbox = document.getElementById('show-logo');
        if (showLogoCheckbox) {
            showLogoCheckbox.addEventListener('change', () => {
                this.updateLayout();
                this.saveLogoSettings();
            });
        }

        const tvp1993EnableBackgroundCheckbox = document.getElementById('tvp1993-enable-background');
        const tvp1993BackgroundColorPicker = document.getElementById('tvp1993-background-color');
        const tvp1993BackgroundColorLabel = document.getElementById('tvp1993-background-color-label');
        const tvp1993ResetButton = document.getElementById('tvp1993-reset-bg');

        if (tvp1993EnableBackgroundCheckbox) {
            tvp1993EnableBackgroundCheckbox.addEventListener('change', () => {
                this.updateTVP1993BackgroundSettings();
                if (tvp1993BackgroundColorLabel) {
                    tvp1993BackgroundColorLabel.style.display = tvp1993EnableBackgroundCheckbox.checked ? 'none' : 'flex';
                }
                if (tvp1993ResetButton) {
                    tvp1993ResetButton.style.display = tvp1993EnableBackgroundCheckbox.checked ? 'none' : 'block';
                }
            });
        }

        if (tvp1993BackgroundColorPicker) {
            tvp1993BackgroundColorPicker.addEventListener('input', () => {
                this.updateTVP1993BackgroundSettings();
            });
        }

        if (tvp1993ResetButton) {
            tvp1993ResetButton.addEventListener('click', () => {
                this.resetTVP1993Background();
            });
        }

        const enableBackgroundCheckbox = document.getElementById('enable-background');
        const backgroundColorPicker = document.getElementById('background-color');
        const backgroundColorLabel = document.getElementById('background-color-label');

        if (enableBackgroundCheckbox) {
            enableBackgroundCheckbox.addEventListener('change', () => {
                this.updateBackgroundSettings();
                // Pokaż/ukryj color picker
                if (backgroundColorLabel) {
                    backgroundColorLabel.style.display = enableBackgroundCheckbox.checked ? 'none' : 'flex';
                }
            });
        }

        if (backgroundColorPicker) {
            backgroundColorPicker.addEventListener('input', () => {
                this.updateBackgroundSettings();
            });
        }

        const showSecondsCheckbox = document.getElementById('show-seconds');
        if (showSecondsCheckbox) {
            showSecondsCheckbox.addEventListener('change', () => {
                this.updateLayout();
                this.saveSecondsSettings();
            });
        }

        const teleexpressEnableBackgroundCheckbox = document.getElementById('teleexpress-enable-background');
        const teleexpressBackgroundColorPicker = document.getElementById('teleexpress-background-color');
        const teleexpressBackgroundColorLabel = document.getElementById('teleexpress-background-color-label');
        const teleexpressResetButton = document.getElementById('teleexpress-reset-bg');

        if (teleexpressEnableBackgroundCheckbox) {
            teleexpressEnableBackgroundCheckbox.addEventListener('change', () => {
                this.updateTeleexpressBackgroundSettings();
                if (teleexpressBackgroundColorLabel) {
                    teleexpressBackgroundColorLabel.style.display = teleexpressEnableBackgroundCheckbox.checked ? 'none' : 'flex';
                }
                if (teleexpressResetButton) {
                    teleexpressResetButton.style.display = teleexpressEnableBackgroundCheckbox.checked ? 'none' : 'block';
                }
            });
        }

        if (teleexpressBackgroundColorPicker) {
            teleexpressBackgroundColorPicker.addEventListener('input', () => {
                this.updateTeleexpressBackgroundSettings();
            });
        }

        if (teleexpressResetButton) {
            teleexpressResetButton.addEventListener('click', () => {
                this.resetTeleexpressBackground();
            });
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
        const teleexpressControls = document.getElementById('teleexpress-controls');
        const skin = this.skins[this.currentSkin];

        if (classicControls) {
            classicControls.style.display = skin.hasAnalogOption || skin.hasDigitalOption ? 'block' : 'none';
        }

        if (tvp1993Controls) {
            tvp1993Controls.style.display = this.currentSkin === 'tvp-1993' ? 'block' : 'none';
        }

        if (teleexpressControls) {
            teleexpressControls.style.display = this.currentSkin === 'teleexpress' ? 'block' : 'none';
        }

        // Przywróć zapisane ustawienia tła dla classic
        if (this.currentSkin === 'classic') {
            this.restoreBackgroundSettings();
        }

        // Przywróć zapisane ustawienia logo dla tvp-1993
        if (this.currentSkin === 'tvp-1993') {
            this.restoreLogoSettings();
        }

        // Przywróć zapisane ustawienia tła dla teleexpress
        if (this.currentSkin === 'teleexpress') {
            this.restoreTeleexpressBackgroundSettings();
            this.restoreSecondsSettings();
        }

        // Przywróć zapisane ustawienia tła dla tvp-1993
        if (this.currentSkin === 'tvp-1993') {
            this.restoreTVP1993BackgroundSettings();
        }
    }

    saveSecondsSettings() {
        const showSecondsCheckbox = document.getElementById('show-seconds');
        if (!showSecondsCheckbox) return;

        const showSeconds = showSecondsCheckbox.checked;
        localStorage.setItem('teleexpress-show-seconds', showSeconds);
    }

    restoreSecondsSettings() {
        const showSecondsCheckbox = document.getElementById('show-seconds');
        if (!showSecondsCheckbox) return;

        // Odczytaj zapisane ustawienia (domyślnie sekundy są włączone)
        const savedShowSeconds = localStorage.getItem('teleexpress-show-seconds') !== 'false';

        // Ustaw wartość kontrolki
        showSecondsCheckbox.checked = savedShowSeconds;

        // Zastosuj ustawienia
        this.updateLayout();
    }

    saveLogoSettings() {
        const showLogoCheckbox = document.getElementById('show-logo');
        if (!showLogoCheckbox) return;

        const showLogo = showLogoCheckbox.checked;
        localStorage.setItem('tvp1993-show-logo', showLogo);
    }

    restoreLogoSettings() {
        const showLogoCheckbox = document.getElementById('show-logo');
        if (!showLogoCheckbox) return;

        // Odczytaj zapisane ustawienia (domyślnie logo jest włączone)
        const savedShowLogo = localStorage.getItem('tvp1993-show-logo') !== 'false';

        // Ustaw wartość kontrolki
        showLogoCheckbox.checked = savedShowLogo;

        // Zastosuj ustawienia
        this.updateLayout();
    }

    updateBackgroundSettings() {
        const enableBackgroundCheckbox = document.getElementById('enable-background');
        const backgroundColorPicker = document.getElementById('background-color');

        if (!enableBackgroundCheckbox || !backgroundColorPicker) return;

        const enableBackground = enableBackgroundCheckbox.checked;
        const backgroundColor = backgroundColorPicker.value;

        // Zapisz ustawienia w localStorage
        localStorage.setItem('classic-enable-background', enableBackground);
        localStorage.setItem('classic-background-color', backgroundColor);

        // Zastosuj ustawienia
        if (enableBackground) {
            document.body.style.backgroundImage = 'url(clock-assets/classic/background.jpg)';
            document.body.style.backgroundColor = '';
        } else {
            document.body.style.backgroundImage = 'none';
            document.body.style.backgroundColor = backgroundColor;
        }
    }

    restoreBackgroundSettings() {
        const enableBackgroundCheckbox = document.getElementById('enable-background');
        const backgroundColorPicker = document.getElementById('background-color');
        const backgroundColorLabel = document.getElementById('background-color-label');

        if (!enableBackgroundCheckbox || !backgroundColorPicker) return;

        // Odczytaj zapisane ustawienia (domyślnie tło jest włączone)
        const savedEnableBackground = localStorage.getItem('classic-enable-background') !== 'false';
        const savedBackgroundColor = localStorage.getItem('classic-background-color') || '#000000';

        // Ustaw wartości kontrolek
        enableBackgroundCheckbox.checked = savedEnableBackground;
        backgroundColorPicker.value = savedBackgroundColor;

        // Pokaż/ukryj color picker w zależności od stanu tła
        if (backgroundColorLabel) {
            backgroundColorLabel.style.display = savedEnableBackground ? 'none' : 'flex';
        }

        // Zastosuj ustawienia
        this.updateBackgroundSettings();
    }

    updateTeleexpressBackgroundSettings() {
        const enableBackgroundCheckbox = document.getElementById('teleexpress-enable-background');
        const backgroundColorPicker = document.getElementById('teleexpress-background-color');

        if (!enableBackgroundCheckbox || !backgroundColorPicker) return;

        const enableBackground = enableBackgroundCheckbox.checked;
        const backgroundColor = backgroundColorPicker.value;

        // Zapisz ustawienia w localStorage
        localStorage.setItem('teleexpress-enable-background', enableBackground);
        localStorage.setItem('teleexpress-background-color', backgroundColor);

        // Zastosuj ustawienia (czarne tło jest domyślne dla Teleexpress)
        if (enableBackground) {
            document.body.style.backgroundColor = '#000';
        } else {
            document.body.style.backgroundColor = backgroundColor;
        }
    }

    restoreTeleexpressBackgroundSettings() {
        const enableBackgroundCheckbox = document.getElementById('teleexpress-enable-background');
        const backgroundColorPicker = document.getElementById('teleexpress-background-color');
        const backgroundColorLabel = document.getElementById('teleexpress-background-color-label');
        const resetButton = document.getElementById('teleexpress-reset-bg');

        if (!enableBackgroundCheckbox || !backgroundColorPicker) return;

        // Odczytaj zapisane ustawienia (domyślnie tło czarne jest włączone)
        const savedEnableBackground = localStorage.getItem('teleexpress-enable-background') !== 'false';
        const savedBackgroundColor = localStorage.getItem('teleexpress-background-color') || '#000000';

        // Ustaw wartości kontrolek
        enableBackgroundCheckbox.checked = savedEnableBackground;
        backgroundColorPicker.value = savedBackgroundColor;

        // Pokaż/ukryj color picker i przycisk resetowania w zależności od stanu tła
        if (backgroundColorLabel) {
            backgroundColorLabel.style.display = savedEnableBackground ? 'none' : 'flex';
        }
        if (resetButton) {
            resetButton.style.display = savedEnableBackground ? 'none' : 'block';
        }

        // Zastosuj ustawienia
        this.updateTeleexpressBackgroundSettings();
    }

    resetTeleexpressBackground() {
        // Resetuj do domyślnych wartości
        localStorage.removeItem('teleexpress-enable-background');
        localStorage.removeItem('teleexpress-background-color');

        // Przywróć domyślne ustawienia
        this.restoreTeleexpressBackgroundSettings();
    }

    updateTVP1993BackgroundSettings() {
        const enableBackgroundCheckbox = document.getElementById('tvp1993-enable-background');
        const backgroundColorPicker = document.getElementById('tvp1993-background-color');

        if (!enableBackgroundCheckbox || !backgroundColorPicker) return;

        const enableBackground = enableBackgroundCheckbox.checked;
        const backgroundColor = backgroundColorPicker.value;

        // Zapisz ustawienia w localStorage
        localStorage.setItem('tvp1993-enable-background', enableBackground);
        localStorage.setItem('tvp1993-background-color', backgroundColor);

        // Zastosuj ustawienia (niebieski kolor rgb(0, 32, 197) jest domyślny dla TVP 1993)
        if (enableBackground) {
            document.body.style.backgroundColor = 'rgb(0, 32, 197)';
        } else {
            document.body.style.backgroundColor = backgroundColor;
        }
    }

    restoreTVP1993BackgroundSettings() {
        const enableBackgroundCheckbox = document.getElementById('tvp1993-enable-background');
        const backgroundColorPicker = document.getElementById('tvp1993-background-color');
        const backgroundColorLabel = document.getElementById('tvp1993-background-color-label');
        const resetButton = document.getElementById('tvp1993-reset-bg');

        if (!enableBackgroundCheckbox || !backgroundColorPicker) return;

        // Odczytaj zapisane ustawienia (domyślnie niebieski background jest włączony)
        const savedEnableBackground = localStorage.getItem('tvp1993-enable-background') !== 'false';
        const savedBackgroundColor = localStorage.getItem('tvp1993-background-color') || '#0020c5';

        // Ustaw wartości kontrolek
        enableBackgroundCheckbox.checked = savedEnableBackground;
        backgroundColorPicker.value = savedBackgroundColor;

        // Pokaż/ukryj color picker i przycisk resetowania w zależności od stanu tła
        if (backgroundColorLabel) {
            backgroundColorLabel.style.display = savedEnableBackground ? 'none' : 'flex';
        }
        if (resetButton) {
            resetButton.style.display = savedEnableBackground ? 'none' : 'block';
        }

        // Zastosuj ustawienia
        this.updateTVP1993BackgroundSettings();
    }

    resetTVP1993Background() {
        // Resetuj do domyślnych wartości
        localStorage.removeItem('tvp1993-enable-background');
        localStorage.removeItem('tvp1993-background-color');

        // Przywróć domyślne ustawienia
        this.restoreTVP1993BackgroundSettings();
    }

    async loadAboutContent() {
        if (window.ABOUT_CONTENT) {
            this.aboutContent = window.ABOUT_CONTENT;
            this.VERSION = this.aboutContent.version;
        } else {
            console.warn('Brak danych about-content.js');
            this.VERSION = '?';
            this.aboutContent = null;
        }
    }

    checkVersion() {
        const lastSeenVersion = localStorage.getItem('last-seen-version');

        if (lastSeenVersion !== this.VERSION) {
            this.showVersionNotification();
        }
    }

    showVersionNotification() {
        // Sprawdź czy powiadomienie już istnieje
        let notification = document.getElementById('version-notification');

        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'version-notification';
            notification.innerHTML = `
                <strong>Aplikacja została uaktualniona do wersji ${this.VERSION}!</strong><br>
                <span style="font-size: 12px;">Sprawdź co nowego!</span>
            `;
            document.body.appendChild(notification);

            // Kliknięcie otwiera okno "O projekcie"
            notification.addEventListener('click', () => {
                this.showAboutDialog();
                this.hideVersionNotification();
            });
        }

        // Pokaż powiadomienie
        notification.classList.remove('hidden');
    }

    hideVersionNotification() {
        const notification = document.getElementById('version-notification');
        if (notification) {
            notification.classList.add('hidden');
        }

        // Zapisz obecną wersję
        localStorage.setItem('last-seen-version', this.VERSION);
    }

    updateLayout() {
        if (!this.currentClock || !this.currentClock.updateLayout) return;

        const showAnalog = document.getElementById('show-analog')?.checked ?? true;
        const showDigital = document.getElementById('show-digital')?.checked ?? true;
        const showLogo = document.getElementById('show-logo')?.checked ?? true;
        const showSeconds = document.getElementById('show-seconds')?.checked ?? true;

        this.currentClock.updateLayout(showAnalog, showDigital, showLogo, showSeconds);
    }

    updateSyncStatus(status, isResync) {
        let statusDiv = document.getElementById('sync-status');
        if (!statusDiv) {
            statusDiv = document.createElement('div');
            statusDiv.id = 'sync-status';
            document.body.appendChild(statusDiv);
        }

        // Jeśli status.syncing === true, pokaż komunikat o synchronizacji
        if (status.syncing) {
            statusDiv.classList.remove('hidden');
            statusDiv.classList.add('syncing');
            statusDiv.innerHTML = '🔄 <strong>Synchronizuję czas...</strong>';
            return;
        }

        // Usuń klasę syncing i pokaż właściwy status
        statusDiv.classList.remove('syncing');

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

    primeAudio() {
        // "Uzbrój" kontekst audio poprzez zagranie cichego tonu poniżej progu słyszalności
        // Używamy bardzo niskiej częstotliwości (5 Hz) która jest poza zakresem słuchu człowieka (20-20000 Hz)
        // To pozwala na wyższy gain bez ryzyka że użytkownik cokolwiek usłyszy
        if (this.audioPrimed || !this.audioCtx) return;

        try {
            const oscillator = this.audioCtx.createOscillator();
            const gainNode = this.audioCtx.createGain();

            oscillator.type = 'sine';
            // 5 Hz - poniżej progu słyszalności człowieka (20 Hz)
            oscillator.frequency.setValueAtTime(5, this.audioCtx.currentTime);
            // Wyższy gain - nie ma ryzyka słyszalności przy tak niskiej częstotliwości
            gainNode.gain.setValueAtTime(0.1, this.audioCtx.currentTime);

            oscillator.connect(gainNode).connect(this.audioCtx.destination);
            oscillator.start(this.audioCtx.currentTime);
            oscillator.stop(this.audioCtx.currentTime + 0.05); // 50ms dla pewności

            this.audioPrimed = true;
        } catch (err) {
            console.warn('Nie udało się uzbroić kanału audio:', err);
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
        if (!pipsCheckbox || !pipsCheckbox.checked) {
            // Jeśli pipy są wyłączone, zresetuj flagę uzbrojenia
            this.audioPrimed = false;
            return;
        }

        let now = this.ntpSync.getSyncedTime();

        if (this.antenaEnabled) {
            now = new Date(now.getTime() + 700);
        }

        const seconds = now.getSeconds();
        const minutes = now.getMinutes();
        const millis = now.getMilliseconds();

        // Uzbrój audio sekundę przed pierwszym pipem (55s, 25s, 54s w trybie testowym)
        if (!this.audioPrimed) {
            const shouldPrime =
                (minutes == 59 && seconds == 54) ||
                (minutes == 29 && seconds == 54) ||
                (this.testEnabled && minutes == 29 && seconds == 14) ||
                (this.testEnabled && minutes == 59 && seconds == 14);

            if (shouldPrime) {
                this.primeAudio();
            }
        }

        if (seconds === this.lastPipSecond) return;

        if (minutes == 59 && seconds >= 55 && seconds <= 59 && millis < 150) {
            this.playPip(0.1);
            this.lastPipSecond = seconds;
        } else if (minutes == 0 && seconds === 0 && millis < 150) {
            this.playPip(0.3);
            this.lastPipSecond = seconds;
            // Zresetuj flagę uzbrojenia po pełnej godzinie
            this.audioPrimed = false;
        } else if (minutes == 29 && seconds >= 55 && seconds <= 59 && millis < 150) {
            this.playPip(0.1);
            this.lastPipSecond = seconds;
        } else if (minutes == 30 && seconds === 0 && millis < 150) {
            this.playPip(0.3);
            this.lastPipSecond = seconds;
            // Zresetuj flagę uzbrojenia po pół godzinie
            this.audioPrimed = false;
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

        const c = this.aboutContent;

        const h3 = (text) => `<h3 style="font-size: 18px; margin-top: 20px; border-bottom: 2px solid rgba(255,255,255,0.3); padding-bottom: 5px;">${text}</h3>`;
        const li = (items) => `<ul style="line-height: 1.8;">${items.map(i => `<li>${i}</li>`).join('')}</ul>`;

        const changelogSection = c ? (() => {
            const entry = c.changelog.find(e => e.version === this.VERSION);
            if (!entry) return '';
            return h3(`Co nowego w wersji ${entry.version}`) + li(entry.items);
        })() : '';

        const skinsSection = c ? li(c.skins.map(s =>
            s.authorUrl
                ? `<strong>${s.name}</strong> – ${s.description} – zaprojektowany przez użytkownika <a href="${s.authorUrl}" target="_blank" style="color: white; text-decoration: underline;"><code>${s.authorName}</code></a>`
                : `<strong>${s.name}</strong> – ${s.description}`
        )) : '';

        const featuresSection = c ? li(c.features.map(f =>
            f.replace(/\?(\S+=\S+)/g, '<code>?$1</code>')
        )) : '';

        const legalSection = c ? c.legal.map(p => `<p style="line-height: 1.6; font-size: 14px;">${p}</p>`).join('') : '';

        modal.innerHTML = `
            <h2 style="margin-top: 0; text-align: center; font-size: 24px; display: flex; align-items: center; justify-content: center; gap: 10px;">
                <img src="assets/favicon.ico" alt="Clock icon" style="width: 32px; height: 32px;">
                Polish Media Clocks
            </h2>

            <div style="text-align: center; margin: 15px 0; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 8px;">
                <strong>Wersja:</strong> ${this.VERSION}
            </div>

            ${changelogSection}

            ${h3('O projekcie')}
            <p style="line-height: 1.6;">${c ? c.about.description : ''}</p>

            ${h3('Dostępne style')}
            ${skinsSection}

            ${h3('Funkcje')}
            ${featuresSection}

            ${h3('Prawa autorskie i licencja')}
            ${legalSection}

            <p style="line-height: 1.6; font-size: 14px; text-align: center;">${c ? c.about.copyright : ''}</p>

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

    showAboutDialog() {
        this.showAbout();
    }
}

// Export dla użycia w innych modułach
if (typeof window !== 'undefined') {
    window.ClockManager = ClockManager;
}
