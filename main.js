// main.js
import AuthService from "./services/AuthService.js";
import FirestoreService from "./services/FirestoreService.js";
import LocalStorageService from "./services/LocalStorageService.js";
import AppState from "./state/AppState.js"; // Importa la instancia singleton
import { debounce } from "./utils/helpers.js";
import { getElement, getElements } from "./utils/dom.js";
import { alertModal, confirmModal } from "./components/Modal.js"; // alertModal y confirmModal
import { noteListModal } from "./components/Modal.js"; // NUEVO: Importa el noteListModal
import ClockWidget from "./widgets/ClockWidget.js";
import CalendarWidget from "./widgets/CalendarWidget.js";
import TimerWidget from "./widgets/TimerWidget.js";
import YoutubeWidget from "./widgets/YoutubeWidget.js";
import Note from "./components/Note.js";
import Zone from "./components/Zone.js";
import { CONSTANTS, USE_FIREBASE } from "./config.js"; // Para usar constantes compartidas

// IMPORTACIÓN NUEVA: Monitoreo de estado de red
import { initNetworkStatusMonitor } from './utils/networkStatus.js';

class App {
    constructor() {
        this.state = AppState; // Usa la instancia singleton de AppState
        this.authService = new AuthService(this.handleAuthStateChange.bind(this));
        this.dataService = null; // Servicio de datos (Firestore o LocalStorage)

        this.DOMElements = {}; // Cache de los elementos DOM principales
        this.widgets = {}; // Almacena instancias de los widgets
        this.noteInstances = new Map(); // Almacena instancias de Note
        this.zoneInstances = new Map(); // Almacena instancias de Zone

        // Debounce para guardar datos en Firestore
        this.debounceSave = debounce(this._saveData.bind(this), 1500);
    }

    init() {
        this.cacheDOM();
        this.applyInitialTheme();
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
        this.DOMElements.themeToggleBtn = getElement('#theme-toggle-btn');
        // NUEVO: Elementos para la funcionalidad de la lista de notas
        this.DOMElements.statsWidget = getElement('#stats-widget');
        this.DOMElements.noteListModalOverlay = getElement('#note-list-modal-overlay');
        this.DOMElements.noteListContainer = getElement('#note-list-container', this.DOMElements.noteListModalOverlay);
        this.DOMElements.noNotesMessage = getElement('.no-notes-message', this.DOMElements.noteListModalOverlay);
    }

    bindGlobalEvents() {
        this.DOMElements.signInBtn.addEventListener('click', () => this.authService.signIn());
        this.DOMElements.signOutBtn.addEventListener('click', () => this.authService.signOut());
        this.DOMElements.addNoteBtn.addEventListener('click', () => this.addNote());
        this.DOMElements.addZoneBtn.addEventListener('click', () => this.addZone());
        this.DOMElements.showGeneralBtn.addEventListener('click', () => { this.showGeneralDashboard(); this.closeSidebar(); });
        this.DOMElements.workspaceTitle.addEventListener('click', () => { if (window.innerWidth <= CONSTANTS.MOBILE_BREAKPOINT) { this.showGeneralDashboard(); this.closeSidebar(); } });
        this.DOMElements.themeToggleBtn.addEventListener('click', () => this.toggleTheme());

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

        // Evento para el widget de notas (APLICADO AL ORIGINAL EN DESKTOP)
        // El clonado en móvil tendrá su propio listener en setupWidgets()
        if (this.DOMElements.statsWidget) {
            this.DOMElements.statsWidget.addEventListener('click', () => this.showAllNotesList());
        }

        // Listener para cerrar la vista de zoom de una nota al hacer clic fuera de ella.
        document.addEventListener('click', (e) => {
            if (this.DOMElements.body.classList.contains('note-view-active')) {
                const zoomedNote = getElement('.note-zoomed');
                // Escenario 1: Hay una nota con zoom y el clic fue fuera de ella.
                if (zoomedNote && !zoomedNote.contains(e.target)) {
                    zoomedNote.classList.remove('note-zoomed');
                    this.DOMElements.body.classList.remove('note-view-active');
                }
                // Escenario 2 (CORRECCIÓN DE BUG): Si por alguna razón el cuerpo tiene la clase de "vista activa"
                // pero ya no hay ninguna nota con zoom, forzamos la limpieza del estado para desbloquear la UI.
                // Esto soluciona el problema del "desenfoque" que no desaparece.
                else if (!zoomedNote) {
                    this.DOMElements.body.classList.remove('note-view-active');
                }
            }
        });
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
                case 'stats-widget': // NUEVO: Manejo específico para el stats-widget clonado
                    // Asegurarse de que el widget clonado sea clickeable para abrir la lista de notas
                    clone.addEventListener('click', () => this.showAllNotesList());
                    break;
            }
            this.DOMElements.sidebarContent.appendChild(clone);
        });
    }

    // --- Métodos de Tema (Modo Oscuro/Claro) ---
    applyInitialTheme() {
        const savedTheme = localStorage.getItem('theme');
        // Comprobar preferencia del sistema si no hay nada guardado
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            this.DOMElements.body.classList.add('dark-mode');
        } else {
            this.DOMElements.body.classList.remove('dark-mode');
        }
    }

    toggleTheme() {
        const isDarkMode = this.DOMElements.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    }

    // --- Métodos de Autenticación y Carga de Datos ---
    handleAuthStateChange(user) {
        this.state.setCurrentUser(user);
        if (user) {
            if (USE_FIREBASE) {
                this.dataService = new FirestoreService(this.authService.getFirebaseApp());
            } else {
                this.dataService = new LocalStorageService();
                this.DOMElements.body.classList.add('local-mode'); // Añadir clase para modo local
            }
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
            const data = await this.dataService.loadUserData(this.state.getCurrentUser().uid);
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
            this.dataService.saveUserData(this.state.getCurrentUser().uid, dataToSave)
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

    _getNewItemDesktopPosition(newItemIsZone = false) {
        // --- Parámetros del layout inteligente ---
        const layout = {
            startX: 20,
            startY: 80, // Debajo de los controles superiores
            gap: 30,
            // El ancho de la columna se basa en el ancho de una nota + el espacio.
            columnWidth: CONSTANTS.DEFAULT_NOTE_WIDTH + 30,
            // El número de columnas se calcula dinámicamente según el espacio disponible.
            numColumns: Math.max(1, Math.floor((window.innerWidth - 40) / (CONSTANTS.DEFAULT_NOTE_WIDTH + 30)))
        };

        const notesOnDate = this.state.getNotes().filter(note => note.date === this.state.getSelectedDate());
        const zonesOnDate = this.state.getZones().filter(zone => zone.date === this.state.getSelectedDate());

        const topLevelItems = [
            ...notesOnDate.filter(n => !n.zoneId),
            ...zonesOnDate
        ];

        // Si no hay elementos, colocar en la primera posición.
        if (topLevelItems.length === 0) {
            return { x: layout.startX, y: layout.startY };
        }

        // Encontrar el punto más bajo de todos los elementos para saber hasta dónde buscar.
        const layoutHeight = topLevelItems.reduce((max, item) => Math.max(max, item.y + (item.height || CONSTANTS.DEFAULT_NOTE_HEIGHT)), 0);

        // Bucle para encontrar el primer hueco disponible en una cuadrícula conceptual.
        for (let y = layout.startY; y < layoutHeight + 1000; y += layout.gap) { // Iterar por filas
            for (let col = 0; col < layout.numColumns; col++) { // Iterar por columnas
                const probeX = layout.startX + col * layout.columnWidth;
                const probeY = y;

                // Comprobar si este punto (probeX, probeY) está ocupado por otro elemento.
                const isOccupied = topLevelItems.some(item => {
                    const itemWidth = item.width || (item.title ? CONSTANTS.DEFAULT_ZONE_WIDTH : CONSTANTS.DEFAULT_NOTE_WIDTH);
                    const itemHeight = item.height || (item.title ? CONSTANTS.DEFAULT_ZONE_HEIGHT : CONSTANTS.DEFAULT_NOTE_HEIGHT);
                    const newItemWidth = newItemIsZone ? CONSTANTS.DEFAULT_ZONE_WIDTH : CONSTANTS.DEFAULT_NOTE_WIDTH;
                    const newItemHeight = newItemIsZone ? CONSTANTS.DEFAULT_ZONE_HEIGHT : CONSTANTS.DEFAULT_NOTE_HEIGHT;

                    // Lógica de colisión de rectángulos (AABB intersection).
                    // Se añade un "gap" al tamaño de los rectángulos para asegurar que no se toquen.
                    return (
                        probeX < (item.x + itemWidth + layout.gap) &&
                        (probeX + newItemWidth + layout.gap) > item.x &&
                        probeY < (item.y + itemHeight + layout.gap) &&
                        (probeY + newItemHeight + layout.gap) > item.y
                    );
                });

                if (!isOccupied) {
                    // Encontramos un hueco. Devolvemos estas coordenadas.
                    return { x: probeX, y: probeY };
                }
            }
        }

        // Fallback por si todo lo demás falla (layout muy denso), apila al final.
        const lowestPoint = topLevelItems.reduce((maxY, item) => Math.max(maxY, (item.y || 0) + (item.height || 240)), 0);
        return { x: layout.startX, y: lowestPoint + layout.gap };
    }

    // --- Métodos de Gestión de Notas/Zonas ---
    addNote(zoneId = null) {
        const isMobile = window.innerWidth <= CONSTANTS.MOBILE_BREAKPOINT;
        let position = { x: 20, y: 20 }; // Posición por defecto

        if (isMobile) {
            if (zoneId) {
                // NOTA CREADA DENTRO DE UNA ZONA EN MÓVIL:
                // Calcular una posición inicial ordenada DENTRO de la zona para la vista de escritorio.
                const parentZone = this.state.getZones().find(z => z.id === zoneId);
                if (parentZone) {
                    const notesInZone = this.state.getNotes().filter(n => n.zoneId === zoneId);
                    const startYInZone = 60; // Empezar a apilar debajo del título de la zona (aprox. 45px) + un margen.
                    const gap = 15;

                    // Encontrar el punto más bajo ocupado por una nota dentro de la zona.
                    const lowestPointInZone = notesInZone.reduce((maxY, note) => {
                        const relativeY = note.y - parentZone.y; // La 'y' de la nota es absoluta, la convertimos a relativa.
                        const noteBottom = relativeY + (note.height || CONSTANTS.DEFAULT_NOTE_HEIGHT);
                        return Math.max(maxY, noteBottom);
                    }, startYInZone - gap); // Empezar desde justo encima de la primera posición posible.

                    position = {
                        x: parentZone.x + 20, // Posición X fija dentro de la zona.
                        y: parentZone.y + lowestPointInZone + gap // Apilar debajo de la última nota.
                    };
                }
            } else {
                // NOTA INDEPENDIENTE CREADA EN MÓVIL: Usar el layout de cuadrícula inteligente.
                position = this._getNewItemDesktopPosition(false); // false porque no es una zona
            }
        }

        const newNote = {
            id: Date.now() + Math.random(),
            x: position.x, y: position.y, width: CONSTANTS.DEFAULT_NOTE_WIDTH, height: CONSTANTS.DEFAULT_NOTE_HEIGHT,
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
        const isMobile = window.innerWidth <= CONSTANTS.MOBILE_BREAKPOINT;
        // Si se crea en móvil, calcular una posición ordenada para la vista de escritorio.
        const position = isMobile ? this._getNewItemDesktopPosition(true) : { x: 50, y: 50 }; // true porque es una zona

        const newZone = {
            id: Date.now() + Math.random(), title: 'Nueva Zona',
            x: position.x, y: position.y, width: CONSTANTS.DEFAULT_ZONE_WIDTH, height: CONSTANTS.DEFAULT_ZONE_HEIGHT,
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
            const oldNote = notes[index];
            const zoneChanged = oldNote.zoneId !== updatedNote.zoneId;

            notes[index] = { ...oldNote, ...updatedNote }; // Fusionar actualizaciones
            this.state.setNotes([...notes]); // Asegura que se actualice la referencia si AppState lo necesita

            // Si la nota se movió hacia/desde una zona, se necesita un re-renderizado completo
            // para mover el elemento DOM al contenedor correcto (app o zona) y aplicar los estilos.
            if (zoneChanged) {
                this.renderWorkspace();
            }
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
        const isMobile = window.innerWidth <= CONSTANTS.MOBILE_BREAKPOINT;
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

        // Renderizar notas. TODAS las notas se renderizan en el contenedor principal en escritorio.
        // Su pertenencia a una zona es visual (clase 'is-in-zone') y lógica, no estructural en el DOM.
        notesToShow.forEach(noteData => {
            const note = new Note(noteData, {
                onDelete: this.deleteNote.bind(this),
                onUpdate: this.updateNote.bind(this),
                findParentZone: this.findParentZone.bind(this)
            });
            this.noteInstances.set(noteData.id, note);

            // Siempre se añade al contenedor principal de notas, que permite el posicionamiento absoluto.
            notesContainer.appendChild(note.getDomElement());
        });
    }

    renderMobileLayout(notesToShow, zonesToShow) {
        const standaloneNotes = notesToShow.filter(note => !note.zoneId || !zonesToShow.some(z => z.id === note.zoneId));

        // 1. Render Standalone Notes Section
        if (standaloneNotes.length > 0) {
            const standaloneSection = document.createElement('div');
            standaloneSection.className = 'mobile-layout-section';
            standaloneSection.innerHTML = `<h3 class="mobile-section-title">Notas Generales</h3>`;
            const notesContainer = document.createElement('div');
            notesContainer.className = 'mobile-notes-container';
            standaloneSection.appendChild(notesContainer);

            standaloneNotes.forEach(noteData => {
                const note = new Note(noteData, {
                    onDelete: this.deleteNote.bind(this),
                    onUpdate: this.updateNote.bind(this),
                    findParentZone: this.findParentZone.bind(this)
                });
                this.noteInstances.set(noteData.id, note);
                notesContainer.appendChild(note.getDomElement());
            });
            this.DOMElements.appContainer.appendChild(standaloneSection);
        }

        // 2. Render Zones Section
        if (zonesToShow.length > 0) {
            const zonesSection = document.createElement('div');
            zonesSection.className = 'mobile-layout-section';
            zonesSection.innerHTML = `<h3 class="mobile-section-title">Zonas de Trabajo</h3>`;
            const zonesContainer = document.createElement('div');
            zonesContainer.className = 'mobile-zones-container';
            zonesSection.appendChild(zonesContainer);
            
            zonesToShow.forEach(zoneData => {
                const zone = new Zone(zoneData, {
                    onDelete: this.deleteZone.bind(this),
                    onUpdate: this.updateZone.bind(this),
                    onAddNoteToZone: this.addNote.bind(this)
                });
                this.zoneInstances.set(zoneData.id, zone);
                const zoneEl = zone.getDomElement();
                zonesContainer.appendChild(zoneEl);

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
            this.DOMElements.appContainer.appendChild(zonesSection);
        }
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
        // MODIFICACIÓN: Ahora cuenta TODAS las notas, no solo las de la vista actual.
        // La idea es que el widget de "Notas" en el dashboard muestre el total de notas que tienes.
        // Si el usuario quiere ver las notas de un día específico, puede usar el calendario.
        const totalNotes = this.state.getNotes().length; 
        getElements('#note-count').forEach(el => el.textContent = totalNotes);
    }

    updateTopControlsVisibility() {
        const isMobile = window.innerWidth <= CONSTANTS.MOBILE_BREAKPOINT;
        const generalBtn = getElement('#show-general-btn');
        const userProfileMenu = getElement('#user-profile-menu'); // Asume que este elemento existe

        if (generalBtn) {
            if (isMobile) {
                generalBtn.style.display = this.state.getSelectedDate() ? 'flex' : 'none';
                generalBtn.innerHTML = '&#128203; General'; // MEJORA: Icono de tablero + texto corto para ahorrar espacio
            } else {
                generalBtn.style.display = 'block';
                generalBtn.textContent = 'Ver Tablero General'; // Restaurar texto original en escritorio
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

    // NUEVO: Método para mostrar la lista de todas las notas
    showAllNotesList() {
        const allNotes = this.state.getNotes();
        const noteListContainer = this.DOMElements.noteListContainer;
        noteListContainer.innerHTML = ''; // Limpiar lista anterior

        // Ordenar notas por fecha (más reciente primero), y notas sin fecha al final
        const sortedNotes = [...allNotes].sort((a, b) => {
            if (!a.date && !b.date) return 0; // Si ambas no tienen fecha, no cambiar el orden relativo
            if (!a.date) return 1; // Las notas sin fecha van al final
            if (!b.date) return -1; // Las notas sin fecha van al final
            return new Date(b.date) - new Date(a.date); // Más reciente primero
        });

        if (sortedNotes.length === 0) {
            this.DOMElements.noNotesMessage.style.display = 'block'; // Mostrar mensaje si no hay notas
        } else {
            this.DOMElements.noNotesMessage.style.display = 'none'; // Ocultar mensaje
            sortedNotes.forEach(note => {
                const noteItem = document.createElement('div');
                noteItem.className = 'note-list-item';
                // Marcar la nota si es del día seleccionado actualmente en el dashboard
                if (note.date === this.state.getSelectedDate()) {
                    noteItem.classList.add('is-active');
                }

                // Formatear la fecha para mostrar en la lista
                const dateDisplay = note.date 
                    ? new Date(note.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
                    : 'Sin Fecha'; // Si no tiene fecha, mostrar "Sin Fecha"
                
                // Obtener el contenido del tab activo o el primer tab, y mostrar una vista previa
                const previewContent = note.tabs && note.tabs.length > 0 && note.tabs[note.activeTabIndex || 0] && note.tabs[note.activeTabIndex || 0].content
                    ? note.tabs[note.activeTabIndex || 0].content.substring(0, 100).replace(/\n/g, ' ') + (note.tabs[note.activeTabIndex || 0].content.length > 100 ? '...' : '')
                    : 'Nota vacía'; // Si no hay contenido, mostrar "Nota vacía"
                
                noteItem.innerHTML = `
                    <span class="note-list-item-date">${dateDisplay}</span>
                    <span class="note-list-item-content">${previewContent}</span>
                    <span class="note-list-item-active-icon">✓</span>
                `;
                // Al hacer clic en un elemento de la lista, navegar a esa fecha
                noteItem.addEventListener('click', () => {
                    this.navigateToDate(note.date);
                });
                noteListContainer.appendChild(noteItem);
            });
        }
        noteListModal.open('Todas tus Notas', ''); // Abre el modal. El mensaje se gestiona dentro de noteListContainer
        this.closeSidebar(); // Cierra el sidebar si el modal se abre desde la versión móvil
    }

    // NUEVO: Método centralizado para navegar a una fecha específica
    navigateToDate(date) {
        // Establece la fecha seleccionada en el estado de la aplicación
        this.state.setSelectedDate(date); 
        // Re-renderiza el espacio de trabajo para mostrar las notas y zonas de la nueva fecha
        this.renderWorkspace(); 
        // Re-renderiza el widget de calendario para que el día seleccionado se marque visualmente
        this.widgets.calendar.render(); 
        if (this.mobileWidgets.calendar) this.mobileWidgets.calendar.render(); // Y el calendario móvil
        // Cierra el modal de la lista de notas después de la navegación
        noteListModal.close(); 
        // Cierra el sidebar si se abrió desde ahí (importante para UX móvil)
        this.closeSidebar(); 
    }

    // --- Callbacks de Widgets ---
    handleCalendarDateSelect(date) {
        // Este callback es llamado por CalendarWidget cuando se selecciona un día.
        // La fecha ya está actualizada en AppState por CalendarWidget (en su método _goToToday).
        // Ahora usamos el nuevo método centralizado para navegar a esa fecha.
        this.navigateToDate(date); 
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
