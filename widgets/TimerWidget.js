// widgets/TimerWidget.js
import { getElement, getElements } from "../utils/dom.js";
import { alertModal, confirmModal } from "../components/Modal.js";
import TimerModal from "../components/TimerModal.js";
import { CONSTANTS } from "../config.js";

/**
 * Un widget de cronómetro profesional y altamente funcional.
 *
 * Características:
 * - Motor de tiempo de alta precisión basado en `requestAnimationFrame`.
 * - Botón de Play/Pause unificado para una UX más limpia.
 * - Presets de tiempo con confirmación para evitar reiniciar sesiones por accidente.
 * - Feedback visual (pulso y color) cuando el temporizador está activo.
 * - El tiempo restante se muestra en el título de la pestaña del navegador.
 * - Formato de tiempo inteligente (oculta horas si son cero).
 * - Estado persistente en localStorage, con recuperación inteligente.
 * - Código encapsulado con campos privados (#) para mayor robustez y mantenibilidad.
 */
class TimerWidget {
    // --- Campos Privados para encapsular el estado y la lógica ---
    #container;
    #alarmSound;
    #timerModal;
    #originalDocTitle = document.title;

    // Elementos DOM cacheados
    #displayEl;
    #editBtn;
    #playPauseBtn;
    #resetBtn;
    #presetContainer;

    // Estado interno del widget
    #state = 'stopped'; // 'stopped', 'running', 'paused'
    #secondsRemaining = 25 * 60;
    #initialDuration = 25 * 60;
    #animationFrameId = null;
    #lastTickTimestamp = 0;

    constructor(containerSelector, appState) { // appState se mantiene por firma, pero no se usa internamente
        this.#container = typeof containerSelector === 'string' ? getElement(containerSelector) : containerSelector;
        if (!this.#container) return;

        this.#alarmSound = getElement('#alarm-sound');

        // --- Cachear todos los elementos DOM una vez ---
        this.#displayEl = getElement('#timer-display', this.#container);
        this.#editBtn = getElement('#edit-timer-btn', this.#container);
        this.#playPauseBtn = getElement('#timer-play-pause-btn', this.#container);
        this.#resetBtn = getElement('#timer-reset-btn', this.#container);
        this.#presetContainer = getElement('.timer-presets', this.#container);
        
        if (!this.#displayEl || !this.#playPauseBtn || !this.#resetBtn) {
            console.error("TimerWidget: Faltan elementos DOM esenciales en el contenedor.");
            return;
        }

        this.#timerModal = new TimerModal(
            'set-timer-modal-overlay', 'set-hours', 'set-minutes', 'set-seconds', 'save-timer-btn'
        );

        this.#bindEvents();
        this.#restoreState();
        this.#updateDisplay();
    }

    #bindEvents() {
        this.#editBtn?.addEventListener('click', () => this.#showModal());
        this.#playPauseBtn.addEventListener('click', () => this.#togglePlayPause());
        this.#resetBtn.addEventListener('click', () => this.#requestConfirmReset());
        this.#presetContainer?.addEventListener('click', (e) => this.#handlePresetClick(e));
    }

    // --- Lógica Principal del Temporizador ---

    #togglePlayPause() {
        if (this.#state === 'running') {
            this.#pause();
        } else {
            this.#start();
        }
    }

    #start() {
        if (this.#state === 'running' || this.#secondsRemaining <= 0) return;
        
        this.#state = 'running';
        this.#lastTickTimestamp = performance.now(); // Usar timestamp de alta precisión
        
        if (this.#animationFrameId) cancelAnimationFrame(this.#animationFrameId);
        this.#animationFrameId = requestAnimationFrame(this.#tick);

        this.#saveState();
        this.#updateDisplay();
    }
    
    #pause() {
        if (this.#state !== 'running') return;
        
        this.#state = 'paused';
        cancelAnimationFrame(this.#animationFrameId);
        this.#animationFrameId = null;

        this.#saveState();
        this.#updateDisplay();
    }

    #reset() {
        this.#state = 'stopped';
        cancelAnimationFrame(this.#animationFrameId);
        this.#animationFrameId = null;
        
        this.#secondsRemaining = this.#initialDuration;
        
        this.#saveState();
        this.#updateDisplay();
    }

    #tick = (timestamp) => {
        if (this.#state !== 'running') return;

        const elapsedMs = timestamp - this.#lastTickTimestamp;
        
        if (elapsedMs >= 1000) {
            const secondsElapsed = Math.floor(elapsedMs / 1000);
            this.#secondsRemaining -= secondsElapsed;
            // CORRECCIÓN CLAVE: Avanzar el timestamp base en lugar de resetearlo.
            // Esto previene la pérdida de milisegundos y mantiene la precisión.
            this.#lastTickTimestamp += secondsElapsed * 1000;
            this.#updateDisplay();

            if (this.#secondsRemaining <= 0) {
                this.#secondsRemaining = 0;
                this.#finish();
                return; // Detener el bucle
            }
        }
        
        this.#animationFrameId = requestAnimationFrame(this.#tick);
    }

    #finish() {
        this.#state = 'stopped';
        this.#alarmSound?.play();
        this.#reset(); // Resetea el contador a su duración inicial
        alertModal.open('¡Tiempo Cumplido!', 'Tu sesión de enfoque ha finalizado.');
    }

    // --- Métodos de UI y Formato ---

    #formatTime(totalSeconds) {
        if (totalSeconds < 0) totalSeconds = 0;
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;

        const formattedM = String(m).padStart(2, '0');
        const formattedS = String(s).padStart(2, '0');
        
        return h > 0 
            ? `${String(h)}:${formattedM}:${formattedS}`
            : `${formattedM}:${formattedS}`;
    }
    
    #updateDisplay() {
        const timeString = this.#formatTime(this.#secondsRemaining);
        
        getElements('#timer-display', this.#container).forEach(el => el.textContent = timeString);

        document.title = (this.#state === 'running' || this.#state === 'paused') && this.#secondsRemaining > 0
            ? `${timeString} - ${this.#originalDocTitle}`
            : this.#originalDocTitle;
        
        getElements('#timer-play-pause-btn', this.#container)
            .forEach(btn => btn.innerHTML = this.#state === 'running' ? CONSTANTS.ICONS.PAUSE : CONSTANTS.ICONS.PLAY);

        this.#container.classList.toggle('timer-running', this.#state === 'running');
        this.#container.classList.toggle('timer-paused', this.#state === 'paused');
        
        this.#updateActivePreset();
    }

    #updateActivePreset() {
        if (!this.#presetContainer) return;
        const activeMinutes = Math.round(this.#initialDuration / 60);
        getElements('.preset-btn', this.#container).forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.minutes) === activeMinutes);
        });
    }

    // --- Manejadores de Eventos y Configuración ---

    #handlePresetClick(e) {
        const target = e.target.closest('.preset-btn');
        if (!target) return;
        
        const minutes = parseInt(target.dataset.minutes, 10);
        if (isNaN(minutes)) return;
        
        const setPreset = () => this.#setDuration(0, minutes, 0);

        // MEJORA: Pedir confirmación si el temporizador está activo
        if (this.#state === 'running' || this.#state === 'paused') {
            confirmModal.open(
                '¿Cambiar Duración?',
                'El temporizador está activo. ¿Quieres detenerlo y cambiar a esta nueva duración?',
                setPreset
            );
        } else {
            setPreset();
        }
    }
    
    #showModal() {
        // MEJORA: Pausar automáticamente si está corriendo al abrir el modal
        if (this.#state === 'running') {
            this.#pause();
        }
        this.#timerModal.open(this.#initialDuration, (h, m, s) => this.#setDuration(h, m, s));
    }

    #setDuration(h, m, s) {
        if (this.#state === 'running') this.#pause();
        this.#initialDuration = (h * 3600) + (m * 60) + s;
        this.#reset();
    }

    #requestConfirmReset() {
        if (this.#state === 'stopped' && this.#secondsRemaining === this.#initialDuration) return;
        confirmModal.open('Reiniciar Cronómetro', 'Esto detendrá el contador y lo restablecerá. ¿Continuar?', () => this.#reset());
    }

    // --- Persistencia de Estado ---

    #saveState() {
        try {
            const timerData = {
                state: this.#state,
                secondsRemaining: this.#secondsRemaining,
                initialDuration: this.#initialDuration,
                savedTimestamp: Date.now()
            };
            localStorage.setItem(CONSTANTS.TIMER_LS_KEY, JSON.stringify(timerData));
        } catch (error) {
            console.error("Error al guardar estado del cronómetro:", error);
        }
    }

    #restoreState() {
        const savedDataJSON = localStorage.getItem(CONSTANTS.TIMER_LS_KEY);
        if (!savedDataJSON) {
            this.#updateDisplay();
            return;
        }

        try {
            const data = JSON.parse(savedDataJSON);
            this.#initialDuration = data.initialDuration || 25 * 60;
            
            if (data.state === 'running' && data.savedTimestamp) {
                const elapsedSeconds = Math.round((Date.now() - data.savedTimestamp) / 1000);
                const newSeconds = data.secondsRemaining - elapsedSeconds;
                
                if (newSeconds > 0) {
                    this.#secondsRemaining = newSeconds;
                    this.#start();
                } else {
                    this.#secondsRemaining = 0;
                    this.#state = 'stopped';
                    alertModal.open('¡Tiempo Cumplido!', 'Tu actividad finalizó mientras la página estaba cerrada.');
                }
            } else {
                this.#secondsRemaining = data.secondsRemaining ?? this.#initialDuration;
                this.#state = data.state || 'stopped';
            }
        } catch (error) {
            console.error("Error al restaurar estado del cronómetro:", error);
            this.#reset();
        }
        
        this.#updateDisplay();
    }
}

export default TimerWidget;