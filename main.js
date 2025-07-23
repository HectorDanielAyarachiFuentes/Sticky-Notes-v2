// main.js
import AuthService from "./services/AuthService.js";
import FirestoreService from "./services/FirestoreService.js";
import AppState from "./state/AppState.js"; // Importa la instancia singleton
import { debounce } from "./utils/helpers.js";
import { getElement, getElements } from "./utils/dom.js";
import { alertModal } from "./components/Modal.js"; // Solo alertModal es global
import ClockWidget from "./widgets/ClockWidget.js";
import CalendarWidget from "./widgets/CalendarWidget.js";
import TimerWidget from "./widgets/TimerWidget.js";
import YoutubeWidget from "./widgets/YoutubeWidget.js";
import Note from "./components/Note.js";
import Zone from "./components/Zone.js";
import { CONSTANTS } from "./config.js"; // Para usar constantes compartidas

// IMPORTACIÓN NUEVA: Monitoreo de estado de red
import { initNetworkStatusMonitor } from './utils/networkStatus.js';

class App {
    constructor() {
        this.state = AppState; // Usa la instancia singleton de AppState
        this.authService = new AuthService(this.handleAuthStateChange.bind(this));
        this.firestoreService = null; // Se inicializará después de la autenticación

        this.DOMElements = {}; // Cache de los elementos DOM principales
        this.widgets = {}; // Almacena instancias de los widgets
        this.noteInstances = new Map(); // Almacena instancias de Note
        this.zoneInstances = new Map(); // Almacena instancias de Zone

        // Debounce para guardar datos en Firestore
        this.debounceSave = debounce(this._saveData.bind(this), 1500);
    }

    init() {
        this.cacheDOM();
        if (localStorage.getItem('dashboardIsHidden') === 'true') {
            this.DOMElements.body.classList.add('dashboard-hidden');
        }
        this.bindGlobalEvents();
        this.setupWidgets();
        // NOTA: initNetworkStatusMonitor ya se llama en el DOMContentLoaded directamente,
        // no es necesario llamarla aquí también a menos que se quiera re-inicializar
        // en algún punto específico del ciclo de vida de la App, lo cual no es común.
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
        // Instancia los widgets del dashboard principal (desktop)
        this.widgets.clock = new ClockWidget('#clock-widget', this.state);
        this.widgets.calendar = new CalendarWidget('#calendar-widget', this.state, this.handleCalendarDateSelect.bind(this));
        this.widgets.timer = new TimerWidget('#timer-widget', this.state);
        this.widgets.youtube = new YoutubeWidget('#youtube-widget', this.state, this.handleYoutubeUrlChange.bind(this));

        // Clonar widgets para la barra lateral móvil y re-instanciar su lógica
        const mainWidgets = this.DOMElements.bottomDashboard.querySelectorAll('.dashboard-widget');
        
        this.mobileWidgets = {}; // Almacenar las instancias de los widgets móviles

        mainWidgets.forEach(mainWidget => {
            const clone = mainWidget.cloneNode(true);
            
            // Instanciamos la lógica para el widget clonado.
            // Usamos el ID del widget original para saber qué clase instanciar.
            switch (mainWidget.id) {
                case 'clock-widget':
                    this.mobileWidgets.clock = new ClockWidget(clone, this.state); 
                    break;
                case 'calendar-widget':
                    this.mobileWidgets.calendar = new CalendarWidget(clone, this.state, this.handleCalendarDateSelect.bind(this));
                    break;
                case 'timer-widget':
                    this.mobileWidgets.timer = new TimerWidget(clone, this.state);
                    break;
                case 'youtube-widget':
                    // YoutubeWidget necesita un tratamiento especial para el ID del reproductor
                    const playerDiv = clone.querySelector('#youtube-player');
                    if (playerDiv) {
                        playerDiv.id = 'youtube-player-mobile'; // Asignar un ID único
                    }
                    this.mobileWidgets.youtube = new YoutubeWidget(clone, this.state, this.handleYoutubeUrlChange.bind(this));
                    break;
            }
            this.DOMElements.sidebarContent.appendChild(clone);
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
            this.state.setNotes(data.notes);
            this.state.setZones(data.zones);
            this.state.setYoutubeUrl(data.youtubeUrl);
            this.state.setIsDataLoaded(true);

            this.renderWorkspace();
            this.widgets.calendar.render();
            if (this.mobileWidgets.calendar) this.mobileWidgets.calendar.render(); // Actualizar calendario móvil
            this.widgets.youtube.initializePlayer();
            if (this.mobileWidgets.youtube) this.mobileWidgets.youtube.initializePlayer(); // Inicializar reproductor móvil
        } catch (error) {
            console.error("Error al cargar datos:", error);
            alertModal.open('Error de Carga', 'No se pudieron cargar tus datos. Intenta de nuevo más tarde.');
        }
    }

    _saveData() { // Función real de guardado (se llama a través de debounceSave)
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
        this.state.notes.push(newNote); // Agrega directamente al array de estado
        this.renderWorkspace();
        this.debounceSave();
        this.updateStats();
        this.widgets.calendar.render();
        if (this.mobileWidgets.calendar) this.mobileWidgets.calendar.render();
    }

    addZone() {
        const newZone = {
            id: Date.now() + Math.random(), title: 'Nueva Zona',
            x: 50, y: 50, width: CONSTANTS.DEFAULT_ZONE_WIDTH, height: CONSTANTS.DEFAULT_ZONE_HEIGHT,
            date: this.state.getSelectedDate()
        };
        this.state.zones.push(newZone); // Agrega directamente al array de estado
        this.renderWorkspace();
        this.debounceSave();
    }

    deleteNote(noteId) {
        this.state.setNotes(this.state.getNotes().filter(n => n.id !== noteId));
        this.renderWorkspace();
        this.debounceSave();
        this.updateStats();
        this.widgets.calendar.render();
        if (this.mobileWidgets.calendar) this.mobileWidgets.calendar.render();
    }

    deleteZone(zoneId) {
        this.state.setZones(this.state.getZones().filter(z => z.id !== zoneId));
        // Desvincular notas de la zona eliminada
        this.state.getNotes().forEach(n => {
            if (n.zoneId === zoneId) n.zoneId = null;
        });
        this.renderWorkspace();
        this.debounceSave();
    }

    updateNote(updatedNote) {
        const notes = this.state.getNotes();
        const index = notes.findIndex(n => n.id === updatedNote.id);
        if (index !== -1) {
            notes[index] = { ...notes[index], ...updatedNote }; // Fusionar actualizaciones
            this.state.setNotes([...notes]); // Asegura que se actualice la referencia si AppState lo necesita
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
        this.DOMElements.appContainer.innerHTML = ''; // Limpiar contenido anterior

        // Limpiar instancias de componentes Note/Zone antes de re-renderizar
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
        this.updateStats();
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
        // En móvil, las zonas actúan como contenedores o se renderizan notas independientes
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
                    findParentZone: this.findParentZone.bind(this) // Aún se necesita para el manejo de zonas en la actualización de notas
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
    }

    updateStats() {
        const notesInView = this.state.getNotes().filter(n => n.date === this.state.getSelectedDate()).length;
        getElements('#note-count').forEach(el => el.textContent = notesInView);
    }

    updateTopControlsVisibility() {
        const isMobile = window.innerWidth <= 768;
        const generalBtn = getElement('#show-general-btn');
        const userProfileMenu = getElement('#user-profile-menu'); // Asume que este elemento existe

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
        this.state.setSelectedDate(null);
        this.debounceSave(); // No se guarda la fecha seleccionada en DB, pero se fuerza un guardado general
        this.renderWorkspace();
        this.widgets.calendar.render(); // Re-renderizar calendario para desmarcar el día
        if (this.mobileWidgets.calendar) this.mobileWidgets.calendar.render();
    }

    closeSidebar() {
        this.DOMElements.body.classList.remove('sidebar-active');
    }

    // --- Callbacks de Widgets ---
    handleCalendarDateSelect(date) {
        // La fecha ya está actualizada en AppState por CalendarWidget
        this.renderWorkspace(); // Re-renderiza el workspace para la nueva fecha
        this.closeSidebar();
    }

    handleYoutubeUrlChange(url) {
        // La URL ya está actualizada en AppState por YoutubeWidget
        this.debounceSave(); // Guarda el estado de la URL de YouTube
    }
}

// Inicializa la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Primero, inicializa el monitoreo de red, ya que crea un elemento DOM global.
    initNetworkStatusMonitor();

    // Luego, inicializa el resto de tu aplicación.
    const appInstance = new App();
    appInstance.init();
});