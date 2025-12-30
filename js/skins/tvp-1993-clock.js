// =============================================================================
// MODUŁ ZEGARA TVP 1993-2012 (z animacją elastic)
// =============================================================================

class TVP1993Clock {
    constructor(ntpSync) {
        this.ntpSync = ntpSync;
        this.TRANSFORM_NAME = typeof document.body.style.transform == 'undefined' ? 'webkitTransform' : 'transform';
    }

    init(container) {
        this.container = container;
        this.render();
        this.setupElements();
        this.updateLayout(true, true, true); // Ustaw domyślne tło (z logo)
        this.startUpdateLoop();
        return this;
    }

    render() {
        this.container.innerHTML = `
            <div class='clock tvp-clock'>
                <div class='hour-hand'><div class='hour-hand-inner'></div></div>
                <div class='minute-hand'><div class='minute-hand-inner'></div></div>
                <div class='second-hand'><div class='second-hand-inner'></div></div>
            </div>
        `;
    }

    setupElements() {
        this.clockEl = this.container.querySelector('.clock');
        this.secondHand = this.clockEl.querySelector('.second-hand-inner');
        this.minuteHand = this.clockEl.querySelector('.minute-hand-inner');
        this.hourHand = this.clockEl.querySelector('.hour-hand-inner');
    }

    easeOutElastic(t) {
        const p = 0.3;
        return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
    }

    updateClock() {
        const time = this.ntpSync.getSyncedTime().getTime();
        const milliSeconds = (time % 1000) * 1.0 / 1000;

        // Animacja elastic dla wskazówki sekundowej
        let adjustedMillis;
        if (milliSeconds > 0.5) {
            adjustedMillis = 0.5 + this.easeOutElastic((milliSeconds - 0.5) / 0.5) * 0.33;
        } else {
            adjustedMillis = -0.17;
        }

        // Wskazówka sekundowa
        const seconds = Math.floor((time / 1000) % 60);
        let rotation = (360 / 60) * seconds;
        this.secondHand.style[this.TRANSFORM_NAME] = `rotate(${rotation}deg)`;

        // Wskazówka minutowa
        const minutes = ((time / 1000 / 60) % 60);
        rotation = (360 / 60) * minutes;
        this.minuteHand.style[this.TRANSFORM_NAME] = `rotate(${rotation}deg)`;

        // Wskazówka godzinowa
        const now = this.ntpSync.getSyncedTime();
        const hours = ((time / 1000 / 60 / 60) % 1) + now.getHours();
        rotation = (360 / 12) * hours;
        this.hourHand.style[this.TRANSFORM_NAME] = `rotate(${rotation}deg)`;
    }

    startUpdateLoop() {
        const loop = () => {
            this.updateClock();
            requestAnimationFrame(loop);
        };
        loop();
    }

    updateLayout(showAnalog, showDigital, showLogo) {
        // Zmień tło w zależności od stanu checkboxa "Logo"
        if (showLogo) {
            this.clockEl.style.backgroundImage = 'url(./clock-assets/tvp-1993/background.png)';
        } else {
            this.clockEl.style.backgroundImage = 'url(./clock-assets/tvp-1993/background-nologo.png)';
        }
    }

    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Export dla użycia w innych modułach
if (typeof window !== 'undefined') {
    window.TVP1993Clock = TVP1993Clock;
}
