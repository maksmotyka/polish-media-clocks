// =============================================================================
// MODUŁ ZEGARA TELEEXPRESSU (Kropkowy)
// =============================================================================

class TeleexpressClock {
    constructor(ntpSync) {
        this.ntpSync = ntpSync;
        this.kropka = [];
        this.cyfra = [];
    }

    init(container) {
        this.container = container;
        this.render();
        this.setupElements();
        this.startUpdateLoop();
        return this;
    }

    render() {
        this.container.innerHTML = `
            <div class="teleexpress-clock">
                <div class="zegar">
                    ${this.renderSecondsRing()}
                    ${this.renderDigitalDisplay()}
                </div>
            </div>
        `;
    }

    renderSecondsRing() {
        let html = '';

        // Renderowanie tarczy wskazującej sekundy
        for (let i = 0; i < 60; i++) {
            if (i % 5 === 0) {
                // Stały punkt co 5 sekund
                html += `<div class="kropka kropka${i}a on"></div>`;
            }
            html += `<div class="kropka kropka${i} on" id="kropka${i}"></div>`;
        }

        return html;
    }

    renderDigitalDisplay() {
        let html = '';

        // 4 cyfry (HH:MM)
        for (let digit = 1; digit <= 4; digit++) {
            // Każda cyfra to siatka 7x5
            for (let row = 0; row < 7; row++) {
                for (let col = 0; col < 5; col++) {
                    html += `<div class="kropka cyfra${digit}w${row}k${col} on" id="cyfra${digit}w${row}k${col}"></div>`;
                }
            }

            // Dwukropek po drugiej cyfrze
            if (digit === 2) {
                html += '<div class="kropka dwukropek1 on"></div><div class="kropka dwukropek2 on"></div>';
            }
        }

        return html;
    }

    setupElements() {
        // Inicjalizacja referencji do kropek sekundowych
        this.kropka = [];
        for (let i = 0; i < 60; i++) {
            this.kropka[i] = document.getElementById(`kropka${i}`);
        }

        // Inicjalizacja referencji do kropek cyfrowych (4 cyfry x 7 wierszy x 5 kolumn)
        this.cyfra = [];
        for (let digit = 0; digit < 4; digit++) {
            this.cyfra[digit] = [];
            for (let row = 0; row < 7; row++) {
                this.cyfra[digit][row] = [];
                for (let col = 0; col < 5; col++) {
                    this.cyfra[digit][row][col] = document.getElementById(`cyfra${digit + 1}w${row}k${col}`);
                }
            }
        }
    }

    wlacz(element) {
        if (element) {
            element.classList.add("on");
            element.classList.remove("off");
        }
    }

    wylacz(element) {
        if (element) {
            element.classList.add("off");
            element.classList.remove("on");
        }
    }

    wlaczC(n, x, y) {
        this.wlacz(this.cyfra[n][x][y]);
    }

    wylaczC(n, x, y) {
        this.wylacz(this.cyfra[n][x][y]);
    }

    wylaczWszystko() {
        // Wyłącz wszystkie kropki cyfr
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 7; j++) {
                for (let k = 0; k < 5; k++) {
                    this.wylaczC(i, j, k);
                }
            }
        }

        // Wyłącz wszystkie kropki sekundowe (oprócz 0, która jest zawsze włączona)
        for (let i = 1; i < 60; i++) {
            this.wylacz(this.kropka[i]);
        }
    }

    rysujCyfre(n, x) {
        const wzory = {
            0: () => {
                this.wlaczC(n, 0, 1); this.wlaczC(n, 0, 2); this.wlaczC(n, 0, 3);
                this.wlaczC(n, 1, 0); this.wlaczC(n, 1, 4);
                this.wlaczC(n, 2, 0); this.wlaczC(n, 2, 4);
                this.wlaczC(n, 3, 0); this.wlaczC(n, 3, 4);
                this.wlaczC(n, 4, 0); this.wlaczC(n, 4, 4);
                this.wlaczC(n, 5, 0); this.wlaczC(n, 5, 4);
                this.wlaczC(n, 6, 1); this.wlaczC(n, 6, 2); this.wlaczC(n, 6, 3);
            },
            1: () => {
                this.wlaczC(n, 0, 2);
                this.wlaczC(n, 1, 1); this.wlaczC(n, 1, 2);
                this.wlaczC(n, 2, 2);
                this.wlaczC(n, 3, 2);
                this.wlaczC(n, 4, 2);
                this.wlaczC(n, 5, 2);
                this.wlaczC(n, 6, 1); this.wlaczC(n, 6, 2); this.wlaczC(n, 6, 3);
            },
            2: () => {
                this.wlaczC(n, 0, 1); this.wlaczC(n, 0, 2); this.wlaczC(n, 0, 3);
                this.wlaczC(n, 1, 0); this.wlaczC(n, 1, 4);
                this.wlaczC(n, 2, 4);
                this.wlaczC(n, 3, 1); this.wlaczC(n, 3, 2); this.wlaczC(n, 3, 3);
                this.wlaczC(n, 4, 0);
                this.wlaczC(n, 5, 0);
                this.wlaczC(n, 6, 0); this.wlaczC(n, 6, 1); this.wlaczC(n, 6, 2); this.wlaczC(n, 6, 3); this.wlaczC(n, 6, 4);
            },
            3: () => {
                this.wlaczC(n, 0, 1); this.wlaczC(n, 0, 2); this.wlaczC(n, 0, 3);
                this.wlaczC(n, 1, 0); this.wlaczC(n, 1, 4);
                this.wlaczC(n, 2, 4);
                this.wlaczC(n, 3, 2); this.wlaczC(n, 3, 3);
                this.wlaczC(n, 4, 4);
                this.wlaczC(n, 5, 0); this.wlaczC(n, 5, 4);
                this.wlaczC(n, 6, 1); this.wlaczC(n, 6, 2); this.wlaczC(n, 6, 3);
            },
            4: () => {
                this.wlaczC(n, 0, 3);
                this.wlaczC(n, 1, 2); this.wlaczC(n, 1, 3);
                this.wlaczC(n, 2, 1); this.wlaczC(n, 2, 3);
                this.wlaczC(n, 3, 0); this.wlaczC(n, 3, 3);
                this.wlaczC(n, 4, 0); this.wlaczC(n, 4, 1); this.wlaczC(n, 4, 2); this.wlaczC(n, 4, 3); this.wlaczC(n, 4, 4);
                this.wlaczC(n, 5, 3);
                this.wlaczC(n, 6, 3);
            },
            5: () => {
                this.wlaczC(n, 0, 0); this.wlaczC(n, 0, 1); this.wlaczC(n, 0, 2); this.wlaczC(n, 0, 3); this.wlaczC(n, 0, 4);
                this.wlaczC(n, 1, 0);
                this.wlaczC(n, 2, 0);
                this.wlaczC(n, 3, 0); this.wlaczC(n, 3, 1); this.wlaczC(n, 3, 2); this.wlaczC(n, 3, 3);
                this.wlaczC(n, 4, 4);
                this.wlaczC(n, 5, 0); this.wlaczC(n, 5, 4);
                this.wlaczC(n, 6, 1); this.wlaczC(n, 6, 2); this.wlaczC(n, 6, 3);
            },
            6: () => {
                this.wlaczC(n, 0, 1); this.wlaczC(n, 0, 2); this.wlaczC(n, 0, 3);
                this.wlaczC(n, 1, 0);
                this.wlaczC(n, 2, 0);
                this.wlaczC(n, 3, 0); this.wlaczC(n, 3, 1); this.wlaczC(n, 3, 2); this.wlaczC(n, 3, 3);
                this.wlaczC(n, 4, 0); this.wlaczC(n, 4, 4);
                this.wlaczC(n, 5, 0); this.wlaczC(n, 5, 4);
                this.wlaczC(n, 6, 1); this.wlaczC(n, 6, 2); this.wlaczC(n, 6, 3);
            },
            7: () => {
                this.wlaczC(n, 0, 0); this.wlaczC(n, 0, 1); this.wlaczC(n, 0, 2); this.wlaczC(n, 0, 3); this.wlaczC(n, 0, 4);
                this.wlaczC(n, 1, 4);
                this.wlaczC(n, 2, 3);
                this.wlaczC(n, 3, 2);
                this.wlaczC(n, 4, 1);
                this.wlaczC(n, 5, 1);
                this.wlaczC(n, 6, 1);
            },
            8: () => {
                this.wlaczC(n, 0, 1); this.wlaczC(n, 0, 2); this.wlaczC(n, 0, 3);
                this.wlaczC(n, 1, 0); this.wlaczC(n, 1, 4);
                this.wlaczC(n, 2, 0); this.wlaczC(n, 2, 4);
                this.wlaczC(n, 3, 1); this.wlaczC(n, 3, 2); this.wlaczC(n, 3, 3);
                this.wlaczC(n, 4, 0); this.wlaczC(n, 4, 4);
                this.wlaczC(n, 5, 0); this.wlaczC(n, 5, 4);
                this.wlaczC(n, 6, 1); this.wlaczC(n, 6, 2); this.wlaczC(n, 6, 3);
            },
            9: () => {
                this.wlaczC(n, 0, 1); this.wlaczC(n, 0, 2); this.wlaczC(n, 0, 3);
                this.wlaczC(n, 1, 0); this.wlaczC(n, 1, 4);
                this.wlaczC(n, 2, 0); this.wlaczC(n, 2, 4);
                this.wlaczC(n, 3, 1); this.wlaczC(n, 3, 2); this.wlaczC(n, 3, 3); this.wlaczC(n, 3, 4);
                this.wlaczC(n, 4, 4);
                this.wlaczC(n, 5, 4);
                this.wlaczC(n, 6, 1); this.wlaczC(n, 6, 2); this.wlaczC(n, 6, 3);
            }
        };

        if (wzory[x]) {
            wzory[x]();
        }
    }

    rysujCzas() {
        const czas = this.ntpSync.getSyncedTime();
        const godziny = czas.getHours();
        const minuty = czas.getMinutes();

        this.rysujCyfre(0, Math.floor(godziny / 10) % 10);
        this.rysujCyfre(1, godziny % 10);
        this.rysujCyfre(2, Math.floor(minuty / 10) % 10);
        this.rysujCyfre(3, minuty % 10);
    }

    rysujSekundy() {
        this.wylaczWszystko();

        const czas = this.ntpSync.getSyncedTime();
        const sekundy = czas.getSeconds();

        for (let i = 0; i <= sekundy; i++) {
            this.wlacz(this.kropka[i]);
        }
    }

    updateClock() {
        this.rysujSekundy();
        this.rysujCzas();
    }

    startUpdateLoop() {
        setInterval(() => {
            this.updateClock();
        }, 1000);

        // Natychmiastowa pierwsza aktualizacja
        this.updateClock();
    }

    updateLayout(showAnalog, showDigital) {
        // Teleexpress clock nie używa tych opcji - zawsze pokazuje swój styl
        // Możemy to zostawić puste lub dodać własną logikę jeśli potrzeba
    }

    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Export dla użycia w innych modułach
if (typeof window !== 'undefined') {
    window.TeleexpressClock = TeleexpressClock;
}
