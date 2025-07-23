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

        this.DOMElements.statsWidget = getElement('#stats-widget');
        this.DOMElements.notesNavigatorModal = getElement('#notes-navigator-modal-overlay');
        this.DOMElements.notesNavigatorList = getElement('#notes-navigator-list');
        this.DOMElements.notesNavigatorCloseBtn = getElement('#notes-navigator-modal-close-btn');
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

        if (this.DOMElements.statsWidget) {
            this.DOMElements.statsWidget.addEventListener('click', () => this.openNotesNavigator());
        }
        if (this.DOMElements.notesNavigatorCloseBtn) {
            this.DOMElements.notesNavigatorCloseBtn.addEventListener('click', () => this.closeNotesNavigator());
        }
        if (this.DOMElements.notesNavigatorModal) {
             this.DOMElements.notesNavigatorModal.addEventListener('click', (e) => {
                if (e.target === this.DOMElements.notesNavigatorModal) {
                    this.closeNotesNavigator();
                }
            });
        }
    }

    setupWidgets() {
        this.widgets.clock = new ClockWidget('#clock-widget');
        this.widgets.calendar = new CalendarWidget('#calendar-widget', this.state, this.handleCalendarDateSelect.bind(this));
        this.widgets.timer = new TimerWidget('#timer-widget', this.state);
        this.widgets.youtube = new YoutubeWidget('#youtube-widget', this.state, this.handleYoutubeUrlChange.bind(this));

        const mainWidgets = this.DOMElements.bottomDashboard.querySelectorAll('.dashboard-widget');
        
        this.mobileWidgets = {};

        mainWidgets.forEach(mainWidget => {
            const clone = mainWidget.cloneNode(true);
            
            switch (mainWidget.id) {
                case 'clock-widget':
                    this.mobileWidgets.clock = new ClockWidget(clone); 
                    break;
                case 'calendar-widget':
                    this.mobileWidgets.calendar = new CalendarWidget(clone, this.state, this.handleCalendarDateSelect.bind(this));
                    break;
                case 'timer-widget':
                    this.mobileWidgets.timer = new TimerWidget(clone, this.state);
                    break;
                case 'youtube-widget':
                    const playerDiv = clone.querySelector('#youtube-player');
                    if (playerDiv) {
                        playerDiv.id = 'youtube-player-mobile';
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
            if (this.mobileWidgets.calendar) this.mobileWidgets.calendar.render();
            this.widgets.youtube.initializePlayer();
            if (this.mobileWidgets.youtube) this.mobileWidgets.youtube.initializePlayer();
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
        this.state.notes.push(newNote);
        this.renderWorkspace();
        this.debounceSave();
        this.updateStats();
        if(this.widgets.calendar) this.widgets.calendar.render();
        if(this.mobileWidgets.calendar) this.mobileWidgets.calendar.render();
    }

    addZone() {
        const newZone = {
            id: Date.now() + Math.random(), title: 'Nueva Zona',
            x: 50, y: 50, width: CONSTANTS.DEFAULT_ZONE_WIDTH, height: CONSTANTS.DEFAULT_ZONE_HEIGHT,
            date: this.state.getSelectedDate()
        };
        this.state.zones.push(newZone);
        this.renderWorkspace();
        this.debounceSave();
    }

    deleteNote(noteId) {
        this.state.setNotes(this.state.getNotes().filter(n => n.id !== noteId));
        this.renderWorkspace();
        this.debounceSave();
        this.updateStats();
        if(this.widgets.calendar) this.widgets.calendar.render();
        if(this.mobileWidgets.calendar) this.mobileWidgets.calendar.render();
    }

    deleteZone(zoneId) {
        this.state.setZones(this.state.getZones().filter(z => z.id !== zoneId));
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
            notes[index] = { ...notes[index], ...updatedNote };
            this.state.setNotes([...notes]);
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
    }

    updateStats() {
        const notesWithContent = this.state.getNotes().filter(note => 
            note.tabs.some(tab => tab.content.trim() !== '')
        );
        const totalNotesCount = notesWithContent.length;
        
        getElements('#note-count').forEach(el => el.textContent = totalNotesCount);
    }

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
        this.state.setSelectedDate(null);
        this.debounceSave();
        this.renderWorkspace();
        if(this.widgets.calendar) this.widgets.calendar.render();
        if(this.mobileWidgets.calendar) this.mobileWidgets.calendar.render();
    }

    closeSidebar() {
        this.DOMElements.body.classList.remove('sidebar-active');
    }

    // --- Callbacks de Widgets ---
    handleCalendarDateSelect(date) {
        this.renderWorkspace();
        this.closeSidebar();
    }

    handleYoutubeUrlChange(url) {
        this.debounceSave();
    }

    // --- Métodos para el Navegador de Notas ---
    openNotesNavigator() {
        const notesWithContent = this.state.getNotes().filter(note =>
            note.tabs.some(tab => tab.content.trim() !== '')
        ).sort((a, b) => new Date(b.date) - new Date(a.date));

        this.DOMElements.notesNavigatorList.innerHTML = '';

        if (notesWithContent.length === 0) {
            this.DOMElements.notesNavigatorList.innerHTML = '<p style="text-align:center; color:#7f8c8d;">No hay notas con contenido.</p>';
        } else {
            notesWithContent.forEach(note => {
                const firstTabWithContent = note.tabs.find(tab => tab.content.trim() !== '');
                if (!firstTabWithContent || !note.date) return;
                
                const previewText = firstTabWithContent.content.trim().substring(0, 50) + '...';
                const [y, m, d] = note.date.split('-');
                const formattedDate = new Date(y, m - 1, d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

                const noteItem = document.createElement('div');
                noteItem.className = 'note-link-item';
                noteItem.dataset.date = note.date;
                
                noteItem.innerHTML = `
                    <span class="content-preview">${previewText}</span>
                    <span class="note-date">${formattedDate}</span>
                `;

                noteItem.addEventListener('click', () => this.navigateToNoteDate(note.date));
                this.DOMElements.notesNavigatorList.appendChild(noteItem);
            });
        }
        
        this.DOMElements.notesNavigatorModal.classList.add('visible');
    }
    
    closeNotesNavigator() {
        this.DOMElements.notesNavigatorModal.classList.remove('visible');
    }

    navigateToNoteDate(dateString) {
        if (!dateString) return;

        // CORRECCIÓN APLICADA AQUÍ
        this.state.setSelectedDate(dateString);
        
        const [year, month] = dateString.split('-').map(Number);
        this.state.getCalendarDate().setFullYear(year);
        this.state.getCalendarDate().setMonth(month - 1);

        this.renderWorkspace();
        
        if (this.widgets.calendar) this.widgets.calendar.render();
        if (this.mobileWidgets.calendar) this.mobileWidgets.calendar.render();

        this.closeNotesNavigator();
        this.closeSidebar();
    }
}

// Inicializa la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    initNetworkStatusMonitor();
    const appInstance = new App();
    appInstance.init();
});