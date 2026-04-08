// =============================================================================
// MODUŁ ZEGARA KLASYCZNEGO (Analogowy + Cyfrowy)
// =============================================================================

class ClassicClock {
    constructor(ntpSync) {
        this.ntpSync = ntpSync;
        this.TRANSFORM_NAME = typeof document.body.style.transform == 'undefined' ? 'webkitTransform' : 'transform';
        this.lastUpdateTime = 0;

        this.clockEl = null;
        this.secondHand = null;
        this.minuteHand = null;
        this.hourHand = null;
        this.digitalClock = null;
        this.analogClock = null;
        this.container = null;
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
            <div id="analog-clock-container">
                <div class='clock' id="analog-clock">
                    <div class='hour-hand'><div class='hour-hand-inner'></div></div>
                    <div class='minute-hand'><div class='minute-hand-inner'></div></div>
                    <div class='second-hand'><div class='second-hand-inner'></div></div>
                </div>
            </div>
            <div id="digital-clock"></div>
        `;
    }

    setupElements() {
        this.clockEl = this.container.querySelector('.clock');
        this.secondHand = this.clockEl.querySelector('.second-hand-inner');
        this.minuteHand = this.clockEl.querySelector('.minute-hand-inner');
        this.hourHand = this.clockEl.querySelector('.hour-hand-inner');
        this.digitalClock = this.container.querySelector('#digital-clock');
        this.analogClock = this.container.querySelector('#analog-clock-container');
    }

    easeInExpo(t) {
        return t === 0 ? 0 : Math.pow(2, 10 * (t - 1));
    }

    updateAnalogClock(now) {
        const seconds = now.getSeconds();
        const milliSeconds = now.getMilliseconds() / 1000;

        const movementDuration = 0.20;
        const animationProgress = Math.min(milliSeconds / movementDuration, 1);
        const smoothMovement = this.easeInExpo(animationProgress);
        let rotation = ((360 / 60) * seconds + smoothMovement * 6 - 6 + 360) % 360;
        this.secondHand.style[this.TRANSFORM_NAME] = `rotate(${rotation}deg)`;

        if (seconds !== Math.floor(this.lastUpdateTime / 1000)) {
            const minutes = now.getMinutes() + seconds / 60;
            rotation = (360 / 60) * minutes;
            this.minuteHand.style[this.TRANSFORM_NAME] = `rotate(${rotation}deg)`;

            const hours = now.getHours() % 12 + minutes / 60;
            rotation = (360 / 12) * hours;
            this.hourHand.style[this.TRANSFORM_NAME] = `rotate(${rotation}deg)`;
        }

        this.lastUpdateTime = now.getTime();
    }

    updateDigitalClock(now) {
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');

        this.digitalClock.textContent = `${hours}:${minutes}:${seconds}`;
    }

    updateClocks() {
        const now = this.ntpSync.getSyncedTime();
        this.updateAnalogClock(now);
        this.updateDigitalClock(now);
    }

    startUpdateLoop() {
        const loop = () => {
            this.updateClocks();
            requestAnimationFrame(loop);
        };
        loop();
    }

    updateLayout(showAnalog, showDigital) {
        this.analogClock.style.display = showAnalog ? 'block' : 'none';
        this.digitalClock.style.display = showDigital ? 'block' : 'none';

        let analogSize = showAnalog && !showDigital ? '90vmin' : '80vmin';
        this.analogClock.style.width = analogSize;
        this.analogClock.style.height = analogSize;

        let digitalFontSize = parseFloat(analogSize) / 5;
        this.digitalClock.style.fontSize = `${digitalFontSize}vmin`;
    }

    destroy() {
        // Cleanup if needed
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Export dla użycia w innych modułach
if (typeof window !== 'undefined') {
    window.ClassicClock = ClassicClock;
}
