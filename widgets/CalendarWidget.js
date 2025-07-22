// project/widgets/CalendarWidget.js
import { getElement } from "../utils/dom.js";

class CalendarWidget {
    constructor(containerSelector, appState, onDateSelectCallback) {
        this.container = typeof containerSelector === 'string' ? getElement(containerSelector) : containerSelector;
        if (!this.container) return;

        this.appState = appState;
        this.onDateSelectCallback = onDateSelectCallback;

        this.prevBtn = getElement('#prev-month', this.container);
        this.nextBtn = getElement('#next-month', this.container);
        this.calendarDays = getElement('#calendar-days', this.container);
        this.monthYearEl = getElement('#month-year', this.container);
        this.todayBtn = getElement('#today-button', this.container); // Ya lo tienes, ¡perfecto!

        this.bindEvents();
        this.render(); // Primera renderización
    }

    bindEvents() {
        this.prevBtn.addEventListener('click', () => {
            this.appState.getCalendarDate().setMonth(this.appState.getCalendarDate().getMonth() - 1);
            this.render();
        });
        this.nextBtn.addEventListener('click', () => {
            this.appState.getCalendarDate().setMonth(this.appState.getCalendarDate().getMonth() + 1);
            this.render();
        });
        if (this.todayBtn) {
            this.todayBtn.addEventListener('click', this._goToToday.bind(this));
        }

        this.calendarDays.addEventListener('click', e => {
            if (e.target.classList.contains('day') && e.target.dataset.date) {
                this.appState.setSelectedDate(e.target.dataset.date);
                this.onDateSelectCallback(this.appState.getSelectedDate()); // Notifica a App.js
                this.render(); // Re-renderizar para marcar el día seleccionado
            }
        });
    }

    // Método modificado para ir al día actual y seleccionarlo
    _goToToday() {
        const today = new Date();

        // 1. Actualizar la fecha del calendario en AppState para que sea el mes y año actuales
        this.appState.getCalendarDate().setFullYear(today.getFullYear());
        this.appState.getCalendarDate().setMonth(today.getMonth());
        // Establecemos el día a 1 para asegurar que la vista del mes sea consistente,
        // la selección del día específico se maneja aparte.
        this.appState.getCalendarDate().setDate(1); 

        // 2. Formatear el día actual a la cadena de fecha esperada (YYYY-MM-DD)
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth(); // 0-indexed
        const currentDay = today.getDate();
        const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;

        // 3. Establecer el día actual como el día seleccionado en AppState
        this.appState.setSelectedDate(dateString);

        // 4. Notificar a App.js sobre la nueva fecha seleccionada (el día de hoy)
        this.onDateSelectCallback(this.appState.getSelectedDate());

        // 5. Re-renderizar el calendario para reflejar tanto el cambio de mes/año
        // como la selección del día actual.
        this.render();
    }

    render() {
        if (!this.calendarDays || !this.monthYearEl) return;

        this.calendarDays.innerHTML = '';
        const currentMonth = this.appState.getCalendarDate().getMonth();
        const currentYear = this.appState.getCalendarDate().getFullYear();
        
        let monthName = new Date(currentYear, currentMonth).toLocaleDateString('es-ES', { month: 'long' });
        monthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        this.monthYearEl.textContent = `${monthName} de ${currentYear}`;

        const noteDates = new Set(this.appState.getNotes().map(n => n.date).filter(Boolean));
        const firstDayIndex = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7; // Lunes = 0
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const today = new Date();

        ['L', 'M', 'X', 'J', 'V', 'S', 'D'].forEach(day => this.calendarDays.innerHTML += `<span class="day-name">${day}</span>`);

        for (let i = 0; i < firstDayIndex; i++) {
            this.calendarDays.innerHTML += `<span></span>`;
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            let classes = 'day';
            if (i === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
                classes += ' current-day';
            }
            if (dateString === this.appState.getSelectedDate()) { // Aquí se aplica la clase 'selected-day'
                classes += ' selected-day';
            }
            if (noteDates.has(dateString)) {
                classes += ' has-notes';
            }
            this.calendarDays.innerHTML += `<span class="${classes}" data-date="${dateString}">${i}</span>`;
        }
    }
}

export default CalendarWidget;