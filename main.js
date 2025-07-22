// project/main.js
import AuthService from "./services/AuthService.js";
import FirestoreService from "./services/FirestoreService.js";
import AppState from "./state/AppState.js";
import { debounce } from "./utils/helpers.js";
import { getElement, getElements } from "./utils/dom.js";
import { alertModal } from "./components/Modal.js";
import ClockWidget from "./widgets/ClockWidget.js";
import CalendarWidget from "./widgets/CalendarWidget.js";
import TimerWidget from "./widgets/TimerWidget.js";
import YoutubeWidget from "./widgets/YoutubeWidget.js";
import StatsWidget from "./widgets/StatsWidget.js"; // NUEVO: Importa el StatsWidget
import Note from "./components/Note.js";
import Zone from "./components/Zone.js";
import { CONSTANTS } from "./config.js";

import { initNetworkStatusMonitor } from './utils/networkStatus.js';

class App {
    constructor() {
        this.state = AppState;
        this.authService = new AuthService(this.handleAuthStateChange.bind(this));
        this.firestoreService = null;

        this.DOMElements = {};
        this.widgets = {};
        this.noteInstances = new Map();
        this.zoneInstances = new Map();

        this.debounceSave = debounce(this._saveData.bind(this), 1500);
    }

    init() {
        this.cacheDOM();
        if (localStorage.getItem('dashboardIsHidden') === 'true') {
            this.DOMElements.body.classList.add('dashboard-hidden');
        }
        this.bindGlobalEvents();
        this.setupWidgets();
    }

    cacheDOM() {
        this.DOMElements.body = document.body;
        this.DOMElements.appContainer = getElement('#app');
        this.DOMElements.signInBtn = getElement('#google-signin-btn');
        this.DOMElements.workspaceTitle = getElement('#workspace-title');
        this.DOMElements.addNoteBtn = getElement('#addNoteBtn');
        this.DOMElements.addZoneBtn = getElement('#addZoneBtn');
        this.DOMElements.showGeneralBtn = getElement('#show-general-btn');
        this.DOMElements.saveStatus = getElement('#save-status');
        this.DOMElements.profileAvatar = getElement('#profile-avatar');
        this.DOMElements.userName = getElement('#user-name');
        this.DOMElements.signOutBtn = getElement('#signout-btn');
        this.DOMElements.bottomDashboard = getElement('#bottom-dashboard');
        this.DOMElements.sidebarToggleBtn = getElement('#sidebar-toggle-btn');
        this.DOMElements.mobileSidebar = getElement('#mobile-sidebar');
        this.DOMElements.sidebarOverlay = getElement('.sidebar-overlay');
        this.DOMElements.sidebarContent = getElement('#mobile-sidebar .sidebar-content');
        this.DOMElements.closeSidebarBtn = getElement('#close-sidebar-btn');
        this.DOMElements.dashboardToggle = getElement('#dashboard-toggle');
        this.DOMElements.fabContainer = getElement('#mobile-fab-container');
        this.DOMElements.fabToggleBtn = getElement('#fab-toggle-btn');
        this.DOMElements.fabAddNoteBtn = getElement('#fab-add-note');
        this.DOMElements.fabAddZoneBtn = getElement('#fab-add-zone');

        // Ya no necesitas obtener #note-count directamente aquí, StatsWidget lo manejará.
        // this.DOMElements.noteCountEl = getElement('#note-count');
    }

    bindGlobalEvents() {
        this.DOMElements.signInBtn.addEventListener('click', () => this.authService.signIn());
        this.DOMElements.signOutBtn.addEventListener('click', () => this.authService.signOut());
        this.DOMElements.addNoteBtn.addEventListener('click', () => this.addNote());
        this.DOMElements.addZoneBtn.addEventListener('click', () => this.addZone());
        this.DOMElements.showGeneralBtn.addEventListener('click', () => { this.showGeneralDashboard(); this.closeSidebar(); });
        this.DOMElements.workspaceTitle.addEventListener('click', () => { if (window.innerWidth <= 768) { this.showGeneralDashboard(); this.closeSidebar(); } });

        const toggleSidebar = () => this.DOMElements.body.classList.toggle('sidebar-active');
        this.DOMElements.sidebarToggleBtn.addEventListener('click', toggleSidebar);
        this.DOMElements.sidebarOverlay.addEventListener('click', toggleSidebar);
        this.DOMElements.closeSidebarBtn.addEventListener('click', toggleSidebar);

        this.DOMElements.dashboardToggle.addEventListener('click', () => {
            const isHidden = this.DOMElements.body.classList.toggle('dashboard-hidden');
            localStorage.setItem('dashboardIsHidden', isHidden);
        });

        this.DOMElements.fabToggleBtn.addEventListener('click', () => this.DOMElements.fabContainer.classList.toggle('fab-active'));
        this.DOMElements.fabAddNoteBtn.addEventListener('click', () => { this.addNote(); this.DOMElements.fabContainer.classList.remove('fab-active'); });
        this.DOMElements.fabAddZoneBtn.addEventListener('click', () => { this.addZone(); this.DOMElements.fabContainer.classList.remove('fab-active'); });
    }

    setupWidgets() {
        this.widgets.clock = new ClockWidget('#clock-widget');
        this.widgets.calendar = new CalendarWidget('#calendar-widget', this.state, this.handleCalendarDateSelect.bind(this));
        this.widgets.timer = new TimerWidget('#timer-widget', this.state);
        this.widgets.youtube = new YoutubeWidget('#youtube-widget', this.state, this.handleYoutubeUrlChange.bind(this));
        // NUEVO: Instancia el StatsWidget
        this.widgets.stats = new StatsWidget('#stats-widget', this.state);

        // Clonar widgets para la barra lateral móvil
        // ATENCIÓN: Al clonar, si el StatsWidget ya está en el DOM principal, se clonará.
        // Si quieres que el clon también sea funcional, deberías instanciarlo de nuevo
        // para el clon y pasarle el ID del contenedor del clon.
        // Por ahora, asumimos que solo necesitas que se vea, la funcionalidad principal estará en el original.
        const widgetsToClone = this.DOMElements.bottomDashboard.querySelectorAll('.dashboard-widget');
        widgetsToClone.forEach(widget => {
            const clone = widget.cloneNode(true);
            this.DOMElements.sidebarContent.appendChild(clone);
            // Si el clon tiene el widget de stats, necesitas re-instanciarlo para que funcione
            // const clonedStatsWidgetContainer = clone.querySelector('#stats-widget');
            // if (clonedStatsWidgetContainer) {
            //     new StatsWidget(clonedStatsWidgetContainer.id, this.state);
            // }
            // Esto se complicaría si tienes IDs duplicados, es mejor que el clonado sea solo para presentación
            // o que los IDs sean únicos y se instancien widgets separados para la sidebar.
        });
    }

    // --- Métodos de Autenticación y Carga de Datos ---
    handleAuthStateChange(user) {
        this.state.setCurrentUser(user);
        if (user) {
            this.firestoreService = new FirestoreService(this.authService.getFirebaseApp());
            this.updateUserProfile(user);
            this.DOMElements.body.classList.remove('logged-out');
            this.DOMElements.body.classList.add('logged-in');
            this.loadData();
        } else {
            this.DOMElements.body.classList.add('logged-out');
            this.DOMElements.body.classList.remove('logged-in');
            this.clearWorkspace();
        }
    }

    updateUserProfile(user) {
        if (user) {
            this.DOMElements.userName.textContent = user.displayName;
            this.DOMElements.profileAvatar.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=random&color=fff`;
        }
    }

    async loadData() {
        if (!this.state.getCurrentUser()) return;
        try {
            const data = await this.firestoreService.loadUserData(this.state.getCurrentUser().uid);
            this.state.setNotes(data.notes); // Esto emitirá 'notesChanged'
            this.state.setZones(data.zones);
            this.state.setYoutubeUrl(data.youtubeUrl);
            this.state.setIsDataLoaded(true);

            this.renderWorkspace();
            this.widgets.calendar.render(); // Asegura que el calendario refleje las notas cargadas
            this.widgets.youtube.initializePlayer(); // Inicia el reproductor de YouTube con la URL cargada
            // this.widgets.stats.render(); // Ya no es necesario llamar explícitamente, los listeners lo manejan
        } catch (error) {
            console.error("Error al cargar datos:", error);
            alertModal.open('Error de Carga', 'No se pudieron cargar tus datos. Intenta de nuevo más tarde.');
        }
    }

    _saveData() {
        if (!this.state.getCurrentUser() || !this.state.isDataLoaded) return;
        this.DOMElements.saveStatus.textContent = 'Guardando...';
        try {
            const dataToSave = {
                notes: this.state.getNotes(),
                zones: this.state.getZones(),
                youtubeUrl: this.state.getYoutubeUrl()
            };
            this.firestoreService.saveUserData(this.state.getCurrentUser().uid, dataToSave)
                .then(() => {
                    this.DOMElements.saveStatus.textContent = 'Guardado ✓';
                    setTimeout(() => this.DOMElements.saveStatus.textContent = '', 2000);
                })
                .catch(error => {
                    console.error("Error al guardar datos:", error);
                    this.DOMElements.saveStatus.textContent = 'Error al guardar';
                });
        } catch (error) {
            console.error("Error al preparar datos para guardar:", error);
            this.DOMElements.saveStatus.textContent = 'Error al guardar';
        }
    }

    // --- Métodos de Gestión de Notas/Zonas ---
    addNote(zoneId = null) {
        const newNote = {
            id: Date.now() + Math.random(),
            x: 20, y: 20, width: CONSTANTS.DEFAULT_NOTE_WIDTH, height: CONSTANTS.DEFAULT_NOTE_HEIGHT,
            date: this.state.getSelectedDate(),
            zoneId: zoneId,
            activeTabIndex: 0,
            tabs: [
                { name: 'Nota 1', content: '' }, { name: 'Nota 2', content: '' },
                { name: 'Nota 3', content: '' }, { name: 'Nota 4', content: '' },
                { name: 'Nota 5', content: '' },
            ]
        };
        this.state.setNotes([...this.state.notes, newNote]); // Usa setNotes para emitir el cambio
        this.renderWorkspace();
        this.debounceSave();
        // this.updateStats(); // ELIMINADO: StatsWidget ahora se auto-actualiza
        this.widgets.calendar.render();
    }

    addZone() {
        const newZone = {
            id: Date.now() + Math.random(), title: 'Nueva Zona',
            x: 50, y: 50, width: CONSTANTS.DEFAULT_ZONE_WIDTH, height: CONSTANTS.DEFAULT_ZONE_HEIGHT,
            date: this.state.getSelectedDate()
        };
        this.state.setZones([...this.state.zones, newZone]); // Usa setZones para emitir el cambio
        this.renderWorkspace();
        this.debounceSave();
    }

    deleteNote(noteId) {
        this.state.setNotes(this.state.getNotes().filter(n => n.id !== noteId)); // Emitirá 'notesChanged'
        this.renderWorkspace();
        this.debounceSave();
        // this.updateStats(); // ELIMINADO
        this.widgets.calendar.render();
    }

    deleteZone(zoneId) {
        this.state.setZones(this.state.getZones().filter(z => z.id !== zoneId));
        // Desvincular notas de la zona eliminada
        const notes = this.state.getNotes().map(n => {
            if (n.zoneId === zoneId) return { ...n, zoneId: null };
            return n;
        });
        this.state.setNotes(notes); // Emitirá 'notesChanged'
        this.renderWorkspace();
        this.debounceSave();
    }

    updateNote(updatedNote) {
        const notes = this.state.getNotes();
        const index = notes.findIndex(n => n.id === updatedNote.id);
        if (index !== -1) {
            notes[index] = { ...notes[index], ...updatedNote };
            this.state.setNotes([...notes]); // Emitirá 'notesChanged'
        }
        this.debounceSave();
    }

    updateZone(updatedZone) {
        const zones = this.state.getZones();
        const index = zones.findIndex(z => z.id === updatedZone.id);
        if (index !== -1) {
            zones[index] = { ...zones[index], ...updatedZone };
            this.state.setZones([...zones]);
        }
        this.debounceSave();
    }

    findParentZone(note) {
        const noteCenterX = note.x + (note.width / 2);
        const noteCenterY = note.y + (note.height / 2);
        // Filtrar solo las zonas de la fecha seleccionada
        const zonesInView = this.state.getZones().filter(zone => zone.date === note.date);
        return zonesInView.find(zone =>
            noteCenterX >= zone.x &&
            noteCenterX <= (zone.x + zone.width) &&
            noteCenterY >= zone.y &&
            noteCenterY <= (zone.y + zone.height)
        );
    }

    // --- Métodos de Renderización del Espacio de Trabajo ---
    renderWorkspace() {
        const isMobile = window.innerWidth <= 768;
        this.DOMElements.appContainer.innerHTML = '';

        this.noteInstances.clear();
        this.zoneInstances.clear();

        const notesToShow = this.state.getNotes().filter(note => note.date === this.state.getSelectedDate());
        const zonesToShow = this.state.getZones().filter(zone => zone.date === this.state.getSelectedDate());

        if (isMobile) {
            this.renderMobileLayout(notesToShow, zonesToShow);
        } else {
            this.renderDesktopLayout(notesToShow, zonesToShow);
        }

        this.updateWorkspaceTitle();
        // this.updateStats(); // ELIMINADO: StatsWidget se auto-actualiza
        this.updateTopControlsVisibility();
    }

    renderDesktopLayout(notesToShow, zonesToShow) {
        const notesContainer = document.createElement('div');
        notesContainer.id = 'notesContainer';
        const zonesContainer = document.createElement('div');
        zonesContainer.id = 'zonesContainer';
        this.DOMElements.appContainer.appendChild(zonesContainer);
        this.DOMElements.appContainer.appendChild(notesContainer);

        zonesToShow.forEach(zoneData => {
            const zone = new Zone(zoneData, {
                onDelete: this.deleteZone.bind(this),
                onUpdate: this.updateZone.bind(this),
                onAddNoteToZone: this.addNote.bind(this)
            });
            this.zoneInstances.set(zoneData.id, zone);
            zonesContainer.appendChild(zone.getDomElement());
        });

        notesToShow.forEach(noteData => {
            const note = new Note(noteData, {
                onDelete: this.deleteNote.bind(this),
                onUpdate: this.updateNote.bind(this),
                findParentZone: this.findParentZone.bind(this)
            });
            this.noteInstances.set(noteData.id, note);
            notesContainer.appendChild(note.getDomElement());
        });
    }

    renderMobileLayout(notesToShow, zonesToShow) {
        zonesToShow.forEach(zoneData => {
            const zone = new Zone(zoneData, {
                onDelete: this.deleteZone.bind(this),
                onUpdate: this.updateZone.bind(this),
                onAddNoteToZone: this.addNote.bind(this)
            });
            this.zoneInstances.set(zoneData.id, zone);
            const zoneEl = zone.getDomElement();
            this.DOMElements.appContainer.appendChild(zoneEl);

            const mobileNotesContainer = getElement('.zone-notes-container-mobile', zoneEl);
            const notesInThisZone = notesToShow.filter(note => note.zoneId === zoneData.id);
            notesInThisZone.forEach(noteData => {
                const note = new Note(noteData, {
                    onDelete: this.deleteNote.bind(this),
                    onUpdate: this.updateNote.bind(this),
                    findParentZone: this.findParentZone.bind(this)
                });
                this.noteInstances.set(noteData.id, note);
                mobileNotesContainer.appendChild(note.getDomElement());
            });
        });

        const standaloneNotes = notesToShow.filter(note => !note.zoneId || !zonesToShow.some(z => z.id === note.zoneId));
        standaloneNotes.forEach(noteData => {
            const note = new Note(noteData, {
                onDelete: this.deleteNote.bind(this),
                onUpdate: this.updateNote.bind(this),
                findParentZone: this.findParentZone.bind(this)
            });
            this.noteInstances.set(noteData.id, note);
            this.DOMElements.appContainer.appendChild(note.getDomElement());
        });
    }

    updateWorkspaceTitle() {
        if (this.state.getSelectedDate()) {
            const [y, m, d] = this.state.getSelectedDate().split('-');
            this.DOMElements.workspaceTitle.textContent = new Date(y, m - 1, d).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
            this.DOMElements.body.classList.remove('general-view');
        } else {
            this.DOMElements.workspaceTitle.textContent = 'Tablero General';
            this.DOMElements.body.classList.add('general-view');
        }
    }

    clearWorkspace() {
        this.DOMElements.appContainer.innerHTML = '';
        this.DOMElements.workspaceTitle.textContent = '';
        this.state.setIsDataLoaded(false);
        this.state.setNotes([]);
        this.state.setZones([]);
        this.noteInstances.clear();
        this.zoneInstances.clear();
        // this.updateStats(); // ELIMINADO: StatsWidget se auto-actualiza
    }

    // ELIMINADO: Este método ya no es necesario, StatsWidget lo maneja
    // updateStats() {
    //     const notesInView = this.state.getNotes().filter(n => n.date === this.state.getSelectedDate()).length;
    //     getElements('#note-count').forEach(el => el.textContent = notesInView);
    // }

    updateTopControlsVisibility() {
        const isMobile = window.innerWidth <= 768;
        const generalBtn = getElement('#show-general-btn');
        const userProfileMenu = getElement('#user-profile-menu');

        if (generalBtn) {
            if (isMobile) {
                generalBtn.style.display = this.state.getSelectedDate() ? 'flex' : 'none';
            } else {
                generalBtn.style.display = 'block';
            }
        }
        if (userProfileMenu) {
            userProfileMenu.style.marginLeft = isMobile ? 'auto' : '0';
        }
    }

    showGeneralDashboard() {
        this.state.setSelectedDate(null); // Emitirá 'selectedDateChanged'
        this.debounceSave();
        this.renderWorkspace();
        this.widgets.calendar.render();
    }

    closeSidebar() {
        this.DOMElements.body.classList.remove('sidebar-active');
    }

    // --- Callbacks de Widgets ---
    handleCalendarDateSelect(date) {
        //setSelectedDate() ya emitirá 'selectedDateChanged', lo que activará StatsWidget.
        this.renderWorkspace();
        this.closeSidebar();
    }

    handleYoutubeUrlChange(url) {
        this.debounceSave();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initNetworkStatusMonitor();
    const appInstance = new App();
    appInstance.init();
});