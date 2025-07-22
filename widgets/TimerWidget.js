// widgets/TimerWidget.js
import { getElement, getElements } from "../utils/dom.js";
import { alertModal, confirmModal } from "../components/Modal.js";
import TimerModal from "../components/TimerModal.js";
import { CONSTANTS } from "../config.js";

class TimerWidget {
    constructor(containerSelector, appState) {
        this.container = typeof containerSelector === 'string' ? getElement(containerSelector) : containerSelector;
        if (!this.container) return;

        this.appState = appState;
        this.alarmSound = getElement('#alarm-sound'); // Suponiendo que está en el DOM global

        this.displayEls = getElements('#timer-display', this.container);
        this.editBtn = getElement('#edit-timer-btn', this.container);
        this.startBtns = getElements('#start-timer', this.container);
        this.stopBtns = getElements('#stop-timer', this.container);
        this.resetBtns = getElements('#reset-timer', this.container);

        this.timerModal = new TimerModal(
            'set-timer-modal-overlay',
            'set-hours',
            'set-minutes',
            'set-seconds',
            'save-timer-btn'
        );

        this.bindEvents();
        this.restoreState();
    }

    bindEvents() {
        if (this.editBtn) this.editBtn.addEventListener('click', () => this.showModal());
        this.startBtns.forEach(btn => btn.addEventListener('click', () => this.requestConfirmStart()));
        this.stopBtns.forEach(btn => btn.addEventListener('click', () => this.requestConfirmPause()));
        this.resetBtns.forEach(btn => btn.addEventListener('click', () => this.requestConfirmReset()));
    }

    updateDisplay() {
        const timer = this.appState.getTimerState();
        const h = String(Math.floor(timer.seconds / 3600)).padStart(2, '0');
        const m = String(Math.floor((timer.seconds % 3600) / 60)).padStart(2, '0');
        const s = String(timer.seconds % 60).padStart(2, '0');
        const timeString = `${h}:${m}:${s}`;

        this.displayEls.forEach(el => {
            el.textContent = timeString;
            el.classList.remove('timer-running', 'timer-paused');
            if (timer.state === 'running') el.classList.add('timer-running');
            else if (timer.state === 'paused') el.classList.add('timer-paused');
        });

        this.startBtns.forEach(btn => btn.classList.toggle('hidden', timer.state === 'running'));
        this.stopBtns.forEach(btn => btn.classList.toggle('hidden', timer.state !== 'running'));
    }

    saveStateToLocalStorage() {
        const timer = this.appState.getTimerState();
        const timerData = {
            state: timer.state,
            seconds: timer.seconds,
            initialDuration: timer.initialDuration,
            savedTimestamp: Date.now()
        };
        localStorage.setItem(CONSTANTS.TIMER_LS_KEY, JSON.stringify(timerData));
    }

    _beginTicking() {
        const timer = this.appState.getTimerState();
        if (timer.interval) clearInterval(timer.interval);
        this.appState.setTimer('interval', setInterval(() => {
            this.appState.setTimer('seconds', timer.seconds - 1);
            this.updateDisplay();
            if (this.appState.getTimerState().seconds <= 0) {
                this.alarmSound.play();
                this.stop(true);
                alertModal.open('¡Tiempo Cumplido!', 'Tu actividad programada ha finalizado.');
            }
        }, 1000));
    }

    start() {
        const timer = this.appState.getTimerState();
        if (timer.state === 'running' || timer.seconds <= 0) return;
        this.appState.setTimer('state', 'running');
        this.saveStateToLocalStorage();
        this.updateDisplay();
        this._beginTicking();
    }

    stop(isFinished = false) {
        const timer = this.appState.getTimerState();
        clearInterval(timer.interval);
        this.appState.setTimer('interval', null);
        this.appState.setTimer('state', isFinished ? 'stopped' : 'paused');
        this.updateDisplay();
        this.saveStateToLocalStorage();
    }

    reset() {
        this.stop(true);
        const timer = this.appState.getTimerState();
        this.appState.setTimer('seconds', timer.initialDuration);
        this.appState.setTimer('state', 'stopped');
        this.updateDisplay();
        this.saveStateToLocalStorage();
    }

    saveSettings(h, m, s) {
        this.appState.setTimer('initialDuration', (h * 3600) + (m * 60) + s);
        this.reset();
    }

    restoreState() {
        const savedDataJSON = localStorage.getItem(CONSTANTS.TIMER_LS_KEY);
        if (!savedDataJSON) {
            this.updateDisplay();
            return;
        }
        const data = JSON.parse(savedDataJSON);
        this.appState.setTimerObject({
            initialDuration: data.initialDuration || 25 * 60,
            seconds: data.seconds,
            state: data.state
        });

        const timer = this.appState.getTimerState();
        if (timer.state === 'running') {
            const elapsedSeconds = Math.round((Date.now() - data.savedTimestamp) / 1000);
            const newSeconds = timer.seconds - elapsedSeconds;
            if (newSeconds > 0) {
                this.appState.setTimer('seconds', newSeconds);
                this.updateDisplay();
                this._beginTicking();
            } else {
                this.appState.setTimer('seconds', 0);
                this.stop(true);
                alertModal.open('¡Tiempo Cumplido!', 'Tu actividad finalizó mientras la página estaba cerrada.');
            }
        } else {
            this.updateDisplay();
        }
    }

    showModal() {
        this.timerModal.open(this.appState.getTimerState().initialDuration, this.saveSettings.bind(this));
    }

    requestConfirmStart() {
        confirmModal.open('Iniciar Temporizador', '¿Estás seguro de que quieres iniciar el tiempo?', this.start.bind(this));
    }

    requestConfirmPause() {
        confirmModal.open('Pausar Temporizador', '¿Quieres pausar el tiempo?', this.stop.bind(this));
    }

    requestConfirmReset() {
        confirmModal.open('Reiniciar Temporizador', 'Esto restablecerá el tiempo a su valor inicial. ¿Continuar?', this.reset.bind(this));
    }
}

export default TimerWidget;