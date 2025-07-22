// widgets/ClockWidget.js
import { getElement } from "../utils/dom.js";

class ClockWidget {
    constructor(containerSelector) {
        this.container = typeof containerSelector === 'string' ? getElement(containerSelector) : containerSelector;
        if (!this.container) return; // Si el widget no está en el DOM, no hacer nada

        this.timeEl = getElement('#current-time', this.container);
        this.dateEl = getElement('#current-date', this.container);

        if (this.timeEl && this.dateEl) {
            this.updateClock();
            // Actualizar cada minuto
            setInterval(() => this.updateClock(), 60000);
        }
    }

    updateClock() {
        const now = new Date();
        this.timeEl.textContent = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        this.dateEl.textContent = now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    }
}

export default ClockWidget;