// widgets/CalendarWidget.js
import { getElement } from "../utils/dom.js";

class CalendarWidget {
    constructor(containerSelector, appState, onDateSelectCallback) {
        this.container = getElement(containerSelector);
        if (!this.container) return;

        this.appState = appState;
        this.onDateSelectCallback = onDateSelectCallback;

        this.prevBtn = getElement('#prev-month', this.container);
        this.nextBtn = getElement('#next-month', this.container);
        this.calendarDays = getElement('#calendar-days', this.container);
        this.monthYearEl = getElement('#month-year', this.container);

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
        this.calendarDays.addEventListener('click', e => {
            if (e.target.classList.contains('day') && e.target.dataset.date) {
                this.appState.setSelectedDate(e.target.dataset.date);
                this.onDateSelectCallback(this.appState.getSelectedDate()); // Notifica a App.js
                this.render(); // Re-renderizar para marcar el día seleccionado
            }
        });
    }

    render() {
        if (!this.calendarDays || !this.monthYearEl) return;

        this.calendarDays.innerHTML = '';
        const currentMonth = this.appState.getCalendarDate().getMonth();
        const currentYear = this.appState.getCalendarDate().getFullYear();
        this.monthYearEl.textContent = new Date(currentYear, currentMonth).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

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
            if (dateString === this.appState.getSelectedDate()) {
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