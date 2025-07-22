// project/widgets/CalendarWidget.js
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
        // NUEVO: Obtener referencia al botón "Hoy"
        this.todayBtn = getElement('#today-button', this.container);

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
        // NUEVO: Añadir event listener para el botón "Hoy"
        if (this.todayBtn) { // Asegúrate de que el botón existe antes de añadir el listener
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

    // NUEVO: Método para navegar a la fecha actual (hoy)
    _goToToday() {
        const today = new Date();
        // Actualiza la fecha del calendario en AppState para que sea el mes y año actuales.
        // Importante: Al modificar la fecha obtenida por getCalendarDate(), estás modificando la referencia
        // del objeto Date directamente en AppState.
        this.appState.getCalendarDate().setFullYear(today.getFullYear());
        this.appState.getCalendarDate().setMonth(today.getMonth());
        this.appState.getCalendarDate().setDate(1); // Opcional: Establecer el día a 1 para asegurar que siempre sea el inicio del mes actual.
                                                 // Esto previene problemas si el mes actual tiene menos días que el mes previo.
        this.render(); // Vuelve a renderizar el calendario para mostrar el mes actual
    }

    render() {
        if (!this.calendarDays || !this.monthYearEl) return;

        this.calendarDays.innerHTML = '';
        const currentMonth = this.appState.getCalendarDate().getMonth();
        const currentYear = this.appState.getCalendarDate().getFullYear();
        
        // Formatear y capitalizar la primera letra del mes
        let monthName = new Date(currentYear, currentMonth).toLocaleDateString('es-ES', { month: 'long' });
        monthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        this.monthYearEl.textContent = `${monthName} de ${currentYear}`;

        const noteDates = new Set(this.appState.getNotes().map(n => n.date).filter(Boolean));
        const firstDayIndex = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7; // Lunes = 0
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const today = new Date();

        // Días de la semana
        ['L', 'M', 'X', 'J', 'V', 'S', 'D'].forEach(day => this.calendarDays.innerHTML += `<span class="day-name">${day}</span>`);

        // Días vacíos al inicio del mes
        for (let i = 0; i < firstDayIndex; i++) {
            this.calendarDays.innerHTML += `<span></span>`;
        }

        // Días del mes
        for (let i = 1; i <= daysInMonth; i++) {
            const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            let classes = 'day';
            if (i === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
                classes += ' current-day'; // Clase para el día actual
            }
            if (dateString === this.appState.getSelectedDate()) {
                classes += ' selected-day'; // Clase para el día seleccionado
            }
            if (noteDates.has(dateString)) {
                classes += ' has-notes'; // Clase para días con notas
            }
            this.calendarDays.innerHTML += `<span class="${classes}" data-date="${dateString}">${i}</span>`;
        }
    }
}

export default CalendarWidget;