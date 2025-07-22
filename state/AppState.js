// project/state/AppState.js

class AppState {
    constructor() {
        if (AppState._instance) {
            return AppState._instance;
        }
        AppState._instance = this;

        this._currentUser = null;
        this._notes = [];
        this._zones = [];
        this._selectedDate = null; // Formato YYYY-MM-DD (null para vista general)
        this._calendarDate = new Date(); // La fecha actual de visualización del calendario
        this._youtubeUrl = '';
        this._isDataLoaded = false;
        this._activeTimer = null; // Almacena el ID del temporizador activo, si hay uno.
        this._timerDisplayTime = CONSTANTS.DEFAULT_TIMER_DURATION_SECONDS; // Duración inicial del temporizador.

        this._listeners = {}; // Objeto para almacenar los listeners
    }

    // --- Métodos para escuchar y emitir eventos ---
    on(eventName, callback) {
        if (!this._listeners[eventName]) {
            this._listeners[eventName] = [];
        }
        this._listeners[eventName].push(callback);
    }

    emit(eventName, data) {
        if (this._listeners[eventName]) {
            this._listeners[eventName].forEach(callback => callback(data));
        }
    }

    // --- Getters ---
    getCurrentUser() { return this._currentUser; }
    getNotes() { return this._notes; }
    getZones() { return this._zones; }
    getSelectedDate() { return this._selectedDate; }
    getCalendarDate() { return this._calendarDate; }
    getYoutubeUrl() { return this._youtubeUrl; }
    getIsDataLoaded() { return this._isDataLoaded; }
    getActiveTimer() { return this._activeTimer; }
    getTimerDisplayTime() { return this._timerDisplayTime; }

    // --- Setters (modificados para emitir eventos) ---
    setCurrentUser(user) {
        this._currentUser = user;
        this.emit('currentUserChanged', this._currentUser);
    }

    setNotes(notes) {
        this._notes = notes;
        this.emit('notesChanged', this._notes); // Emitir evento al cambiar las notas
    }

    setZones(zones) {
        this._zones = zones;
        this.emit('zonesChanged', this._zones);
    }

    setSelectedDate(date) {
        this._selectedDate = date;
        this.emit('selectedDateChanged', this._selectedDate); // Emitir evento al cambiar la fecha seleccionada
    }

    setCalendarDate(date) { // Si necesitas cambiar directamente el _calendarDate
        this._calendarDate = date;
        this.emit('calendarDateChanged', this._calendarDate);
    }

    setYoutubeUrl(url) {
        this._youtubeUrl = url;
        this.emit('youtubeUrlChanged', this._youtubeUrl);
    }

    setIsDataLoaded(isLoaded) {
        this._isDataLoaded = isLoaded;
        this.emit('isDataLoadedChanged', this._isDataLoaded);
    }

    setActiveTimer(timerId) {
        this._activeTimer = timerId;
        this.emit('activeTimerChanged', this._activeTimer);
    }

    setTimerDisplayTime(time) {
        this._timerDisplayTime = time;
        this.emit('timerDisplayTimeChanged', this._timerDisplayTime);
    }
}

// Exporta una única instancia para el patrón Singleton
const appStateInstance = new AppState();
export default appStateInstance;