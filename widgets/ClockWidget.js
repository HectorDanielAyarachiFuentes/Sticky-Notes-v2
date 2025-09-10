// widgets/ClockWidget.js
import { getElement } from "../utils/dom.js";

class ClockWidget {
    // Pass appState to get user's name
    constructor(containerSelector, appState) {
        this.container = typeof containerSelector === 'string' ? getElement(containerSelector) : containerSelector;
        if (!this.container) return;

        this.appState = appState;

        // Cache new DOM elements
        this.greetingEl = getElement('#clock-greeting', this.container);
        this.timeEl = getElement('#current-time', this.container);
        this.secondsEl = getElement('#current-seconds', this.container); // New element for seconds
        this.dateEl = getElement('#current-date', this.container);
        
        // Internal state for the widget
        this.showSeconds = false; 

        if (this.timeEl && this.dateEl && this.greetingEl && this.secondsEl) {
            this.bindEvents();
            this.updateClock();
            // Update every second now
            setInterval(() => this.updateClock(), 1000);
        }
    }

    bindEvents() {
        // Toggle seconds display on click
        this.container.addEventListener('click', () => {
            this.showSeconds = !this.showSeconds;
            this.secondsEl.classList.toggle('hidden', !this.showSeconds);
            this.updateClock(); // Re-call to apply formatting immediately
        });
    }

    getGreeting(hour) {
        if (hour >= 0 && hour < 5) { // Madrugada (00:00 - 04:59)
            return "Buenas noches 🌙";
        } else if (hour >= 5 && hour < 7) { // Amanecer (05:00 - 06:59)
            return "¡A empezar el día! 🌅";
        } else if (hour >= 7 && hour < 12) { // Mañana (07:00 - 11:59)
            return "Buenos días ☀️";
        } else if (hour >= 12 && hour < 14) { // Mediodía (12:00 - 13:59)
            return "¡Buen provecho! 🍽️";
        } else if (hour >= 14 && hour < 20) { // Tarde (14:00 - 19:59)
            return "Buenas tardes 🌤️";
        } else {
            return "Buenas noches 🌃";
        }
    }

    updateClock() {
        const now = new Date();
        const hour = now.getHours();

        // 1. Update Greeting
        this.greetingEl.innerHTML = this.getGreeting(hour); // Use innerHTML for emoji

        // 2. Update Time (HH:MM)
        this.timeEl.textContent = now.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // 3. Update Seconds
        this.secondsEl.textContent = `:${String(now.getSeconds()).padStart(2, '0')}`;
        // Ensure visibility is correct based on the state
        this.secondsEl.classList.toggle('hidden', !this.showSeconds);

        // 4. Update Date
        let fullDate = now.toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });
        // Capitalize the weekday
        this.dateEl.textContent = fullDate.charAt(0).toUpperCase() + fullDate.slice(1);
    }
}

export default ClockWidget;