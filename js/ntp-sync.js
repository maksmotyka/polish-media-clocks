// =============================================================================
// MODUŁ SYNCHRONIZACJI CZASU Z NTP GUM + INTELIGENTNA RESYNCHRONIZACJA
// =============================================================================

class NTPSync {
    constructor() {
        this.BACKEND_URL = 'https://timeserv.maksplus.xyz/api/time';

        this.FALLBACK_SERVERS = [
            {
                name: 'WorldTimeAPI',
                url: 'https://worldtimeapi.org/api/timezone/Europe/Warsaw',
                parse: (data) => new Date(data.datetime)
            }
        ];

        this.timeOffset = 0;
        this.timeSourceUsed = 'system';
        this.ntpServerUsed = 'Nieznany';
        this.lastSyncTime = 0;
        this.syncCount = 0;
        this.resyncTimer = null;

        this.RESYNC_INTERVAL = 15 * 60 * 1000;
        this.MIN_RESYNC_INTERVAL = 5 * 60 * 1000;
        this.INACTIVE_THRESHOLD = 5 * 60 * 1000;
        this.TIME_JUMP_THRESHOLD = 2000;

        this.lastTimeCheck = Date.now();
        this.timeJumpDetectionEnabled = true;
        this.visibilityResyncTimer = null;

        this.onSyncCallback = null;

        this.setupEventListeners();
        this.startTimeJumpDetection();
    }

    async fetchTimeFromNTP() {
        try {
            console.log('Łączę z GUM...');
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const response = await fetch(this.BACKEND_URL, {
                signal: controller.signal,
                cache: 'no-cache'
            });

            clearTimeout(timeoutId);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            if (!data.success) throw new Error(data.error || 'Uwaga! Serwer zwrócił błąd.');

            const serverTime = new Date(data.timestamp);
            this.ntpServerUsed = data.source;

            console.log(`✓ Połączono z NTP GUM: ${data.source}`);
            console.log(`  Czas NTP: ${serverTime.toISOString()}`);
            console.log(`  Typ serwera: ${data.serverType}`);
            console.log(`  Opóźnienie: ${(data.delay * 1000).toFixed(2)}ms`);
            console.log(`  Offset NTP: ${(data.offset * 1000).toFixed(2)}ms`);

            return { time: serverTime, type: data.serverType };
        } catch (error) {
            console.error('✗ Błąd połączenia ze wzorcem czasu:', error.message);
            throw error;
        }
    }

    async fetchTimeFromFallback(server) {
        try {
            console.log(`Łączę z ${server.name}...`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(server.url, {
                signal: controller.signal,
                cache: 'no-cache'
            });

            clearTimeout(timeoutId);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            const serverTime = server.parse(data);
            console.log(`✓ Połączono z ${server.name}`);
            return serverTime;
        } catch (error) {
            console.error(`✗ Błąd ${server.name}:`, error.message);
            throw error;
        }
    }

    async initializeTimeSync(isResync = false) {
        const prefix = isResync ? '🔄 RESYNC' : 'INIT';

        console.log('='.repeat(40));
        console.log(`${prefix} - Synchronizacja czasu z GUM`);
        console.log(`Sync #${++this.syncCount} | Serwer: ${this.BACKEND_URL}`);
        console.log('='.repeat(40));

        const oldOffset = this.timeOffset;

        try {
            const result = await this.fetchTimeFromNTP();
            const localTime = new Date();
            this.timeOffset = result.time.getTime() - localTime.getTime();
            this.timeSourceUsed = result.type === 'primary' ? 'ntp-primary' : 'ntp-backup';
            this.lastSyncTime = Date.now();

            if (isResync) {
                const drift = Math.abs(this.timeOffset - oldOffset);
                console.log(`📊 Drift wykryty: ${drift}ms`);
                if (drift > 500) console.warn('⚠️ Duży drift! Zegar lokalny mocno dryfuje.');
            }

            console.log(`📊 Offset: ${this.timeOffset}ms`);
            console.log(`✅ Źródło: GUM (${this.ntpServerUsed})`);
            console.log('='.repeat(40));

            this.notifySyncComplete(isResync);
            this.scheduleNextResync();
            return;
        } catch (error) {
            console.warn('⚠ GUM niedostępny, łączę z serwerem zapasowym...');
        }

        for (const server of this.FALLBACK_SERVERS) {
            try {
                const serverTime = await this.fetchTimeFromFallback(server);
                const localTime = new Date();
                this.timeOffset = serverTime.getTime() - localTime.getTime();
                this.timeSourceUsed = 'fallback';
                this.ntpServerUsed = server.name;
                this.lastSyncTime = Date.now();

                console.log(`📊 Offset czasu: ${this.timeOffset}ms`);
                console.log(`⚠ Źródło: Fallback (${server.name})`);
                console.log('='.repeat(40));

                this.notifySyncComplete(isResync);
                this.scheduleNextResync();
                return;
            } catch (error) {
                console.warn(`Fallback ${server.name} niedostępny`);
            }
        }

        console.log('🔴 UWAGA: Używam czasu systemowego');
        console.log('   Brak połączenia z GUM i serwerami zapasowymi');
        console.log('='.repeat(40));
        this.timeOffset = 0;
        this.timeSourceUsed = 'system';
        this.ntpServerUsed = 'Czas systemowy';
        this.lastSyncTime = Date.now();

        this.notifySyncComplete(isResync);
        this.scheduleNextResync();
    }

    scheduleNextResync() {
        if (this.resyncTimer) clearTimeout(this.resyncTimer);
        this.resyncTimer = setTimeout(() => {
            console.log('⏰ Zaplanowana resynchronizacja');
            this.initializeTimeSync(true);
        }, this.RESYNC_INTERVAL);

        const nextSync = new Date(Date.now() + this.RESYNC_INTERVAL);
        console.log(`⏰ Następny resync: ${nextSync.toLocaleTimeString()}`);
    }

    getSyncedTime() {
        return new Date(Date.now() + this.timeOffset);
    }

    getSyncStatus() {
        return {
            timeSourceUsed: this.timeSourceUsed,
            ntpServerUsed: this.ntpServerUsed,
            timeOffset: this.timeOffset,
            lastSyncTime: this.lastSyncTime
        };
    }

    onSync(callback) {
        this.onSyncCallback = callback;
    }

    notifySyncComplete(isResync) {
        if (this.onSyncCallback) {
            this.onSyncCallback(this.getSyncStatus(), isResync);
        }
    }

    setupEventListeners() {
        // Safari workaround - resetuj lastTimeCheck przy wznowieniu
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                // Safari fix: resetuj timer skoku czasu
                this.lastTimeCheck = Date.now();

                const timeSinceLastSync = Date.now() - this.lastSyncTime;
                if (timeSinceLastSync > this.INACTIVE_THRESHOLD) {
                    console.log('🔄 Resync: Powrót do karty po nieaktywności');

                    // Poczekaj 500ms aby Safari obudził sieć
                    if (this.visibilityResyncTimer) clearTimeout(this.visibilityResyncTimer);
                    this.visibilityResyncTimer = setTimeout(() => {
                        this.initializeTimeSync(true);
                    }, 500);
                }
            }
        });

        window.addEventListener('focus', () => {
            // Safari fix: resetuj timer skoku czasu
            this.lastTimeCheck = Date.now();

            const timeSinceLastSync = Date.now() - this.lastSyncTime;
            if (timeSinceLastSync > this.INACTIVE_THRESHOLD) {
                console.log('🔄 Resync: Focus po nieaktywności');

                // Poczekaj 500ms aby Safari obudził sieć
                setTimeout(() => {
                    this.initializeTimeSync(true);
                }, 500);
            }
        });
    }

    startTimeJumpDetection() {
        setInterval(() => {
            // Wyłącz detekcję skoku czasu jeśli karta niewidoczna
            if (document.hidden) {
                this.timeJumpDetectionEnabled = false;
                return;
            }

            // Włącz ponownie gdy karta widoczna
            if (!this.timeJumpDetectionEnabled) {
                this.timeJumpDetectionEnabled = true;
                this.lastTimeCheck = Date.now();
                return;
            }

            const now = Date.now();
            const expectedDiff = 1000;
            const actualDiff = now - this.lastTimeCheck;

            if (Math.abs(actualDiff - expectedDiff) > this.TIME_JUMP_THRESHOLD) {
                console.warn(`⚠️ Wykryto skok czasu! (${actualDiff}ms zamiast ${expectedDiff}ms)`);

                // Poczekaj chwilę przed resync
                setTimeout(() => {
                    console.log('🔄 Resync: Po skoku czasu');
                    this.initializeTimeSync(true);
                }, 1000); // Zwiększone opóźnienie dla Safari
            }

            this.lastTimeCheck = now;
        }, 1000);
    }
}

// Export dla użycia w innych modułach
if (typeof window !== 'undefined') {
    window.NTPSync = NTPSync;
}
