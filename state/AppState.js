// state/AppState.js

// Singleton para el estado de la aplicación
class AppState {
    constructor() {
        if (!AppState.instance) {
            this.currentUser = null;
            this.notes = [];
            this.zones = [];
            this.youtubeUrl = '';
            this.youtubePlayer = null;
            this.selectedDate = null; // Fecha del tablero actual (YYYY-MM-DD)
            this.isDataLoaded = false;
            this.calendarDate = new Date(); // Fecha actual del calendario del widget
            this.timer = {
                interval: null,
                seconds: 25 * 60,
                initialDuration: 25 * 60,
                state: 'stopped', /* 'stopped', 'running', 'paused' */
                preAlertShown: false,
                pendingAction: null,
            };
            AppState.instance = this;
        }
        return AppState.instance;
    }

    // Métodos para actualizar el estado y potencialmente notificar cambios
    setCurrentUser(user) { this.currentUser = user; }
    setNotes(notes) { this.notes = notes; }
    setZones(zones) { this.zones = zones; }
    setYoutubeUrl(url) { this.youtubeUrl = url; }
    setSelectedDate(date) { this.selectedDate = date; }
    setIsDataLoaded(loaded) { this.isDataLoaded = loaded; }
    setCalendarDate(date) { this.calendarDate = date; }
    setTimer(key, value) { this.timer[key] = value; }
    setTimerObject(obj) { this.timer = { ...this.timer, ...obj }; }

    // Métodos para obtener datos del estado
    getNotes() { return this.notes; }
    getZones() { return this.zones; }
    getYoutubeUrl() { return this.youtubeUrl; }
    getSelectedDate() { return this.selectedDate; }
    getCalendarDate() { return this.calendarDate; }
    getTimerState() { return this.timer; }
    getCurrentUser() { return this.currentUser; }
}

export default new AppState(); // Exporta una única instancia