// project/widgets/CalendarWidget.js
import { getElement, createElement } from "../utils/dom.js"; // Asegúrate de que createElement esté aquí

class CalendarWidget {
    constructor(containerSelector, appState, onDateSelectCallback) {
        this.container = getElement(containerSelector);
        if (!this.container) {
            console.error(`CalendarWidget: No se encontró el contenedor con el selector ${containerSelector}`);
            return;
        }

        this.appState = appState;
        this.onDateSelectCallback = onDateSelectCallback;

        this.prevBtn = getElement('#prev-month', this.container);
        this.nextBtn = getElement('#next-month', this.container);
        this.todayBtn = getElement('#today-button', this.container); // Asegúrate de que este botón exista en tu HTML
        this.calendarDaysContainer = getElement('#calendar-days', this.container);
        this.monthYearEl = getElement('#month-year', this.container);

        this.isAnimating = false; // Bandera para controlar animaciones

        this.bindEvents();
        this.render(); // Primera renderización
    }

    bindEvents() {
        this.prevBtn.addEventListener('click', () => this.changeMonth(-1));
        this.nextBtn.addEventListener('click', () => this.changeMonth(1));
        
        // Asegurarse de que el botón exista antes de añadir el listener
        if (this.todayBtn) { 
            this.todayBtn.addEventListener('click', () => this.goToToday());
        }

        this.calendarDaysContainer.addEventListener('click', e => {
            if (e.target.classList.contains('day') && e.target.dataset.date) {
                this.appState.setSelectedDate(e.target.dataset.date);
                this.onDateSelectCallback(this.appState.getSelectedDate()); // Notifica a App.js
                this.render(); // Re-renderizar para marcar el día seleccionado
            }
        });
    }

    changeMonth(delta) {
        if (this.isAnimating) return;
        this.appState.getCalendarDate().setMonth(this.appState.getCalendarDate().getMonth() + delta);
        this.render(true); // Pasar 'true' para indicar que hay animación
    }

    goToToday() {
        if (this.isAnimating) return;
        const today = new Date();
        this.appState.getCalendarDate().setFullYear(today.getFullYear());
        this.appState.getCalendarDate().setMonth(today.getMonth());
        
        // Establecer el día seleccionado al día actual si es diferente, para provocar render.
        const todayFormatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        if (this.appState.getSelectedDate() !== todayFormatted) {
            this.appState.setSelectedDate(todayFormatted);
            this.onDateSelectCallback(this.appState.getSelectedDate());
        }
        this.render(true); // Indicar animación
    }

    render(animate = false) {
        if (!this.calendarDaysContainer || !this.monthYearEl) return;

        const currentMonth = this.appState.getCalendarDate().getMonth();
        const currentYear = this.appState.getCalendarDate().getFullYear();
        this.monthYearEl.textContent = new Date(currentYear, currentMonth).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

        const noteDates = new Set(this.appState.getNotes().map(n => n.date).filter(Boolean));
        const firstDayIndex = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const today = new Date();
        const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        const daysFragment = document.createDocumentFragment();

        ['L', 'M', 'X', 'J', 'V', 'S', 'D'].forEach(dayName => {
            const span = createElement('span', 'day-name');
            span.textContent = dayName;
            daysFragment.appendChild(span);
        });

        for (let i = 0; i < firstDayIndex; i++) {
            daysFragment.appendChild(createElement('span'));
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const dayEl = createElement('span', 'day');
            dayEl.textContent = i;
            dayEl.dataset.date = dateString;

            if (dateString === todayString) {
                dayEl.classList.add('current-day');
            }
            if (dateString === this.appState.getSelectedDate()) {
                dayEl.classList.add('selected-day');
            }
            if (noteDates.has(dateString)) {
                dayEl.classList.add('has-notes');
            }
            daysFragment.appendChild(dayEl);
        }

        if (animate) {
            this.isAnimating = true;
            this.calendarDaysContainer.classList.add('fade-out');

            // Esperar a que la animación de salida termine
            setTimeout(() => {
                this.calendarDaysContainer.innerHTML = '';
                this.calendarDaysContainer.appendChild(daysFragment);

                this.calendarDaysContainer.classList.remove('fade-out');
                this.calendarDaysContainer.classList.add('fade-in');

                // Esperar a que la animación de entrada termine
                setTimeout(() => {
                    this.calendarDaysContainer.classList.remove('fade-in');
                    this.isAnimating = false;
                }, 300); // Duración de la animación (0.3s)
            }, 300); // Duración de la animación de fade-out
        } else {
            this.calendarDaysContainer.innerHTML = '';
            this.calendarDaysContainer.appendChild(daysFragment);
        }
    }
}

export default CalendarWidget;