// project/widgets/CalendarWidget.js
import { getElement } from "../utils/dom.js";

class CalendarWidget {
    constructor(containerSelector, appState, onDateSelectCallback) {
        this.container = typeof containerSelector === 'string' ? getElement(containerSelector) : containerSelector;
        if (!this.container) return;

        this.appState = appState;
        this.onDateSelectCallback = onDateSelectCallback; // Este callback es crucial para notificar a App.js

        this.prevBtn = getElement('#prev-month', this.container);
        this.nextBtn = getElement('#next-month', this.container);
        this.calendarDays = getElement('#calendar-days', this.container);
        this.monthYearEl = getElement('#month-year', this.container);
        this.todayBtn = getElement('#today-button', this.container); 

        this.bindEvents();
        this.render(); // Primera renderización al iniciar
    }

    bindEvents() {
        this.prevBtn.addEventListener('click', () => {
            this.appState.getCalendarDate().setMonth(this.appState.getCalendarDate().getMonth() - 1);
            this.render(); // Re-renderiza el calendario para el nuevo mes
        });
        this.nextBtn.addEventListener('click', () => {
            this.appState.getCalendarDate().setMonth(this.appState.getCalendarDate().getMonth() + 1);
            this.render(); // Re-renderiza el calendario para el nuevo mes
        });
        if (this.todayBtn) {
            this.todayBtn.addEventListener('click', this._goToToday.bind(this));
        }

        this.calendarDays.addEventListener('click', e => {
            const clickedDay = e.target.closest('.day'); // Usar closest para asegurar que es un día válido
            if (clickedDay && clickedDay.dataset.date) {
                // MODIFICACIÓN CLAVE: Llama al callback para que App.js maneje la selección de fecha.
                // App.js se encargará de actualizar el estado, re-renderizar el workspace,
                // y luego volverá a llamar a CalendarWidget.render() para actualizar la selección visual.
                this.onDateSelectCallback(clickedDay.dataset.date); 
            }
        });
    }

    // Método modificado para ir al día actual y seleccionarlo
    _goToToday() {
        const today = new Date();

        // Actualizar la fecha del calendario en AppState para mostrar el mes y año actuales
        this.appState.getCalendarDate().setFullYear(today.getFullYear());
        this.appState.getCalendarDate().setMonth(today.getMonth());
        // Establecemos el día a 1 para asegurar que la vista del mes sea consistente.
        this.appState.getCalendarDate().setDate(1); 

        // Formatear el día actual a la cadena de fecha esperada (YYYY-MM-DD)
        const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        // MODIFICACIÓN CLAVE: Notificar a App.js sobre la nueva fecha seleccionada (el día de hoy).
        // App.js manejará el resto: actualizará el estado global, re-renderizará el workspace,
        // y luego llamará a CalendarWidget.render() para marcar el día.
        this.onDateSelectCallback(dateString);

        // Volvemos a renderizar el calendario de inmediato para que el cambio de mes/año sea instantáneo.
        // La clase 'selected-day' se aplicará en la siguiente renderización que App.js dispare.
        this.render(); 
    }

    render() {
        if (!this.calendarDays || !this.monthYearEl) return;

        this.calendarDays.innerHTML = ''; // Limpiar el grid de días
        const currentMonth = this.appState.getCalendarDate().getMonth();
        const currentYear = this.appState.getCalendarDate().getFullYear();
        
        let monthName = new Date(currentYear, currentMonth).toLocaleDateString('es-ES', { month: 'long' });
        monthName = monthName.charAt(0).toUpperCase() + monthName.slice(1); // Capitalizar
        this.monthYearEl.textContent = `${monthName} de ${currentYear}`;

        const noteDates = new Set(this.appState.getNotes().map(n => n.date).filter(Boolean)); // Fechas con notas
        const firstDayIndex = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7; // Lunes = 0, para ajustar el inicio
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate(); // Obtener el número de días en el mes
        const today = new Date(); // Fecha actual para marcar "Hoy"

        // Días de la semana
        ['L', 'M', 'X', 'J', 'V', 'S', 'D'].forEach(day => this.calendarDays.innerHTML += `<span class="day-name">${day}</span>`);

        // Rellenar días vacíos al inicio del mes
        for (let i = 0; i < firstDayIndex; i++) {
            this.calendarDays.innerHTML += `<span></span>`;
        }

        // Renderizar los días del mes
        for (let i = 1; i <= daysInMonth; i++) {
            const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            let classes = 'day';
            
            // Marcar el día actual
            if (i === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
                classes += ' current-day';
            }
            // Marcar el día seleccionado en AppState
            if (dateString === this.appState.getSelectedDate()) { 
                classes += ' selected-day';
            }
            // Marcar si hay notas en esa fecha
            if (noteDates.has(dateString)) {
                classes += ' has-notes';
            }
            this.calendarDays.innerHTML += `<span class="${classes}" data-date="${dateString}">${i}</span>`;
        }
    }
}

export default CalendarWidget;
