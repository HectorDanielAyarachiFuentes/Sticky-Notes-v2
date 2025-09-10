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
// IMPORTACIÓN NUEVA: Animación del cielo
import { initSkyAnimation } from './utils/sky-animation.js';

class App {
    constructor() {
        this.state = AppState; // Usa la instancia singleton de AppState
        this.authService = new AuthService(this.handleAuthStateChange.bind(this));
        this.dataService = null; // Servicio de datos (Firestore o LocalStorage)

        this.DOMElements = {}; // Cache de los elementos DOM principales
        this.widgets = {}; // Almacena instancias de los widgets
        this.noteInstances = new Map(); // Almacena instancias de Note
        this.zoneInstances = new Map(); // Almacena instancias de Zone

        this.currentSliderZoneId = null; // NUEVO: para saber en qué zona estamos en el slider
        // NUEVO: Estado para el pan y zoom del espacio de trabajo
        this.pan = { x: 0, y: 0, scale: 1 };
        this.isPanning = false;
        this.lastMousePos = { x: 0, y: 0 };


        // Debounce para guardar datos en Firestore
        this.debounceSave = debounce(this._saveData.bind(this), 1500);
    }

    init() {
        this.cacheDOM();
        this.applyInitialTheme();
        if (localStorage.getItem('dashboardIsHidden') === 'true') {
            this.DOMElements.body.classList.add('dashboard-hidden');
        }
        this.createSliderPlaceholder();
        this.bindGlobalEvents();
        this.setupWidgets();
        // NOTA: initNetworkStatusMonitor ya se llama en el DOMContentLoaded directamente,
        // no es necesario llamarla aquí también a menos que se quiera re-inicializar
        // en algún punto específico del ciclo de vida de la App, lo cual no es común.
    }

    cacheDOM() {
        this.DOMElements.body = document.body;
        this.DOMElements.appContainer = getElement('#app');
        this.DOMElements.workspace = getElement('#workspace');
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
        this.DOMElements.loaderOverlay = getElement('#loader-overlay');
        this.DOMElements.themeToggleBtn = getElement('#theme-toggle-btn');
        // NUEVO: Controles de zoom
        this.DOMElements.zoomControls = getElement('#zoom-controls');
        this.DOMElements.zoomInBtn = getElement('#zoom-in-btn');
        this.DOMElements.zoomOutBtn = getElement('#zoom-out-btn');
        this.DOMElements.zoomResetBtn = getElement('#zoom-reset-btn');
        // NUEVO: Elementos para la funcionalidad de la lista de notas
        this.DOMElements.statsWidget = getElement('#stats-widget');
        this.DOMElements.noteListModalOverlay = getElement('#note-list-modal-overlay');
        this.DOMElements.noteListContainer = getElement('#note-list-container', this.DOMElements.noteListModalOverlay);
        this.DOMElements.noNotesMessage = getElement('.no-notes-message', this.DOMElements.noteListModalOverlay);
        // NUEVO: Elementos para el slider de notas de zona
        this.DOMElements.sliderOverlay = getElement('#slider-overlay');
        this.DOMElements.sliderPanel = getElement('#zone-notes-slider');
        this.DOMElements.sliderTitle = getElement('#slider-zone-title');
        this.DOMElements.sliderCloseBtn = getElement('#slider-close-btn');
        this.DOMElements.sliderNotesList = getElement('#slider-notes-list');
        this.DOMElements.sliderNoteContent = getElement('#slider-note-content');
        this.DOMElements.sliderAddNoteBtn = getElement('#slider-add-note-btn');
    }

    createSliderPlaceholder() {
        const placeholder = document.createElement('div');
        placeholder.className = 'slider-no-note-selected';
        placeholder.innerHTML = '<p>Selecciona una nota de la lista para verla aquí.</p>';
        this.DOMElements.sliderNoNoteSelected = placeholder;
    }

    bindGlobalEvents() {
        this.DOMElements.signInBtn.addEventListener('click', () => this.authService.signIn());
        this.DOMElements.signOutBtn.addEventListener('click', () => this.authService.signOut());
        this.DOMElements.addNoteBtn.addEventListener('click', () => this.addNote());
        this.DOMElements.addZoneBtn.addEventListener('click', () => this.addZone());
        this.DOMElements.showGeneralBtn.addEventListener('click', () => { this.showGeneralDashboard(); this.closeSidebar(); });
        this.DOMElements.workspaceTitle.addEventListener('click', () => { if (window.innerWidth <= CONSTANTS.MOBILE_BREAKPOINT) { this.showGeneralDashboard(); this.closeSidebar(); } });
        this.DOMElements.themeToggleBtn.addEventListener('click', () => this.toggleTheme());

        const toggleSidebar = () => {
            const isActive = this.DOMElements.body.classList.toggle('sidebar-active');
            if (isActive && this.mobileWidgets.youtube) {
                this.mobileWidgets.youtube.manualInit();
            }
        };
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

        // NUEVO: Eventos de Pan y Zoom para el escritorio
        if (window.innerWidth > CONSTANTS.MOBILE_BREAKPOINT) {
            this.DOMElements.appContainer.addEventListener('mousedown', this.handlePanStart.bind(this));
            this.DOMElements.appContainer.addEventListener('wheel', this.handleZoom.bind(this), { passive: false });
            // Los listeners de movimiento y soltar se añaden al documento para capturar el movimiento fuera de la ventana
            document.addEventListener('mousemove', this.handlePanMove.bind(this));
            document.addEventListener('mouseup', this.handlePanEnd.bind(this));
            document.addEventListener('mouseleave', this.handlePanEnd.bind(this)); // Termina el paneo si el ratón sale de la ventana
        }

        // Evento para el widget de notas (APLICADO AL ORIGINAL EN DESKTOP)
        // El clonado en móvil tendrá su propio listener en setupWidgets()
        if (this.DOMElements.statsWidget) {
            this.DOMElements.statsWidget.addEventListener('click', () => this.showAllNotesList());
        }

        // NUEVO: Eventos para los botones de zoom
        if (this.DOMElements.zoomInBtn) {
            this.DOMElements.zoomInBtn.addEventListener('click', () => this.zoomIn());
            this.DOMElements.zoomOutBtn.addEventListener('click', () => this.zoomOut());
            this.DOMElements.zoomResetBtn.addEventListener('click', () => this.resetZoom());
        }

        // Listener para cerrar la vista de zoom de una nota al hacer clic fuera de ella.
        document.addEventListener('click', (e) => {
            if (this.DOMElements.body.classList.contains('note-view-active')) {
                const zoomedNote = getElement('.note-zoomed');
                // Si hay una nota con zoom y el clic fue fuera de ella, o si no hay nota con zoom (estado fantasma), limpiar.
                if (zoomedNote && !zoomedNote.contains(e.target)) {
                    this.clearZoomState();
                } else if (!zoomedNote) { // Corrige el estado de "desenfoque" si no hay nota ampliada
                    this.clearZoomState();
                }
            }
        });

        // NUEVO: Eventos para el slider de notas de zona
        this.DOMElements.sliderCloseBtn.addEventListener('click', () => this.closeZoneNotesViewer());
        this.DOMElements.sliderOverlay.addEventListener('click', () => this.closeZoneNotesViewer());
        this.DOMElements.sliderAddNoteBtn.addEventListener('click', () => this.handleSliderAddNote());

        // Evento para seleccionar una nota de la lista en el slider
        this.DOMElements.sliderNotesList.addEventListener('click', e => {
            const noteItem = e.target.closest('.slider-note-item');
            if (noteItem && noteItem.dataset.noteId) {
                const noteId = parseFloat(noteItem.dataset.noteId);
                this.renderSliderContent(noteId);
            }
        });

        // Evento para guardar el contenido de la nota al escribir en el slider
        this.DOMElements.sliderNoteContent.addEventListener('input', e => {
            const target = e.target;
            if (target.tagName.toLowerCase() === 'textarea') { // Si se edita el contenido
                this.handleSliderContentChange(target);
            } else if (target.classList.contains('slider-note-tab')) { // Si se edita el nombre de una pestaña
                this.handleSliderTabNameChange(target);
            }
        });

        // NUEVO: Evento para cambiar de pestaña DENTRO del slider
        this.DOMElements.sliderNoteContent.addEventListener('click', e => {
            const tabBtn = e.target.closest('.slider-note-tab');
            // Si se hace clic en una pestaña y NO es la que ya está activa, cambiar de pestaña.
            // Si es la activa, no hacer nada para permitir que el usuario la edite.
            if (tabBtn && !tabBtn.classList.contains('active')) {
                const noteId = parseFloat(tabBtn.dataset.noteId);
                const newTabIndex = parseInt(tabBtn.dataset.tabIndex);
                const noteData = this.state.getNotes().find(n => n.id === noteId);
                if (noteData && noteData.activeTabIndex !== newTabIndex) {
                    noteData.activeTabIndex = newTabIndex;
                    this.updateNote(noteData); // Guardar el cambio de pestaña activa
                    this.renderSliderContent(noteId); // Re-renderizar para mostrar el cambio
                }
            }
        });

        // NUEVO: Eventos para mejorar la edición de los nombres de las pestañas
        this.DOMElements.sliderNoteContent.addEventListener('keydown', e => {
            // Prevenir saltos de línea en los títulos de las pestañas
            if (e.target.classList.contains('slider-note-tab') && e.key === 'Enter') {
                e.preventDefault();
                e.target.blur(); // Quita el foco para "confirmar" el cambio
            }
        });

        this.DOMElements.sliderNoteContent.addEventListener('blur', e => {
            // Si una pestaña queda vacía al perder el foco, restaurar un nombre por defecto
            const target = e.target;
            if (target.classList.contains('slider-note-tab') && target.innerText.trim() === '') {
                const tabIndex = parseInt(target.dataset.tabIndex);
                target.innerText = `Pestaña ${tabIndex + 1}`;
                // Disparar el manejador de cambio manualmente para que se guarde el cambio
                this.handleSliderTabNameChange(target);
            }
        }, true); // Usar captura para asegurar que se ejecute
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
                    const input = clone.querySelector('#youtube-url-input');
                    if (input) {
                        input.id = 'youtube-url-input-mobile';
                        input.setAttribute('list', 'youtube-history-list-mobile');
                    }
                    const dataList = clone.querySelector('#youtube-history-list');
                    if (dataList) {
                        dataList.id = 'youtube-history-list-mobile';
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
        const wasLoggedIn = !!this.state.getCurrentUser(); // Captura el estado de sesión anterior
        this.state.setCurrentUser(user);

        if (user) {
            if (USE_FIREBASE) {
                this.dataService = new FirestoreService(this.authService.getFirebaseApp());
            } else {
                this.dataService = new LocalStorageService();
                this.DOMElements.body.classList.add('local-mode'); // Añadir clase para modo local
            }
            this.DOMElements.loaderOverlay.classList.add('visible'); // Mostrar loader
            this.updateUserProfile(user);
            this.DOMElements.body.classList.remove('logged-out');
            this.DOMElements.body.classList.add('logged-in');
            this.loadData();
        } else {
            this.DOMElements.body.classList.add('logged-out');
            this.DOMElements.body.classList.remove('logged-in');
            this.clearWorkspace();

            // CORRECCIÓN: Forzar el reinicio de la animación de la bandera SÓLO al cerrar sesión,
            // no en la carga inicial de la página. Si 'wasLoggedIn' es true, significa que
            // estamos pasando de un estado logueado a uno deslogueado.
            if (wasLoggedIn) {
                // Al cerrar sesión, reiniciamos las animaciones del fondo (nubes y bandera)
                // forzando al navegador a re-renderizar el contenido.
                const loginBackground = getElement('#login-background');
                if (loginBackground) {
                    const backgroundHTML = loginBackground.innerHTML;
                    loginBackground.innerHTML = '';
                    setTimeout(() => { 
                        loginBackground.innerHTML = backgroundHTML; 
                        // Re-inicializar la animación del cielo después de reconstruir el DOM
                        initSkyAnimation();
                    }, 0);
                }
            }
            // Adaptar UI para modo local al estar deslogueado
            if (!USE_FIREBASE) {
                this.DOMElements.body.classList.add('local-mode');
                this.DOMElements.signInBtn.textContent = '🚀 Entrar como Invitado';
            } else {
                // Asegurarse de que el texto original esté presente si se desloguea de Firebase
                this.DOMElements.signInBtn.textContent = '🚀 Iniciar Sesión con Google';
            }
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
            this.state.youtubeUrlHistory = data.youtubeUrlHistory || []; // Cargar historial
            // NUEVO: Cargar estado de pan y zoom
            this.pan.x = data.panX || 0;
            this.pan.y = data.panY || 0;
            this.pan.scale = data.zoom || 1;

            this.state.setIsDataLoaded(true);

            this.renderWorkspace();
            this.widgets.calendar.render();
            if (this.mobileWidgets.calendar) this.mobileWidgets.calendar.render(); // Actualizar calendario móvil
            this.widgets.youtube.initializePlayer();
            if (this.mobileWidgets.youtube) this.mobileWidgets.youtube.initializePlayer(); // Inicializar reproductor móvil
        } catch (error) {
            console.error("Error al cargar datos:", error);
            alertModal.open('Error de Carga', 'No se pudieron cargar tus datos. Intenta de nuevo más tarde.');
        } finally {
            // NUEVO: Ocultar el loader cuando la carga termina (con éxito o error)
            this.DOMElements.loaderOverlay.classList.remove('visible');
        }
    }

    _saveData() { // Función real de guardado (se llama a través de debounceSave)
        if (!this.state.getCurrentUser() || !this.state.isDataLoaded) return;
        this.DOMElements.saveStatus.textContent = 'Guardando...';
        try {
            const dataToSave = {
                notes: this.state.getNotes(),
                zones: this.state.getZones(),
                youtubeUrl: this.state.getYoutubeUrl(),
                youtubeUrlHistory: this.state.youtubeUrlHistory || [], // Guardar historial
                panX: this.pan.x,
                panY: this.pan.y,
                zoom: this.pan.scale
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

    // --- NUEVO: Métodos para Pan y Zoom ---

    applyWorkspaceTransform() {
        if (this.DOMElements.workspace) {
            this.DOMElements.workspace.style.transform = `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.pan.scale})`;
        }
    }

    handlePanStart(e) {
        // Solo inicia el paneo si se hace clic en el fondo, no en una nota o zona.
        if (e.target !== this.DOMElements.appContainer && e.target !== this.DOMElements.workspace) {
            return;
        }
        e.preventDefault();
        this.isPanning = true;
        this.lastMousePos = { x: e.clientX, y: e.clientY };
        this.DOMElements.appContainer.classList.add('panning');
    }

    handlePanMove(e) {
        if (!this.isPanning) return;
        e.preventDefault();
        const dx = e.clientX - this.lastMousePos.x;
        const dy = e.clientY - this.lastMousePos.y;
        this.pan.x += dx;
        this.pan.y += dy;
        this.lastMousePos = { x: e.clientX, y: e.clientY };
        this.applyWorkspaceTransform();
    }

    handlePanEnd(e) {
        if (!this.isPanning) return;
        this.isPanning = false;
        this.DOMElements.appContainer.classList.remove('panning');
        this.debounceSave(); // Guarda la nueva posición
    }

    handleZoom(e) {
        // Solo permite zoom si el cursor está sobre el fondo
        if (e.target !== this.DOMElements.appContainer && e.target !== this.DOMElements.workspace) {
            return;
        }
        e.preventDefault();

        const zoomSpeed = 0.1;
        const minZoom = 0.2;
        const maxZoom = 2.5;

        const oldScale = this.pan.scale;
        const delta = e.deltaY > 0 ? -1 : 1; // Hacia abajo aleja, hacia arriba acerca
        const newScale = Math.max(minZoom, Math.min(maxZoom, oldScale + delta * zoomSpeed * oldScale));

        if (newScale === oldScale) return;

        const rect = this.DOMElements.appContainer.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        this.pan.x = mouseX - (mouseX - this.pan.x) * (newScale / oldScale);
        this.pan.y = mouseY - (mouseY - this.pan.y) * (newScale / oldScale);
        this.pan.scale = newScale;

        this.applyWorkspaceTransform();
        this.debounceSave(); // Guarda el nuevo estado de zoom y pan
    }

    // NUEVO: Métodos para los botones de control de zoom
    zoom(direction) {
        const zoomSpeed = 0.2; // Un poco más rápido para los clics de botón
        const minZoom = 0.2;
        const maxZoom = 2.5;

        const oldScale = this.pan.scale;
        // direction es 1 para acercar, -1 para alejar
        const newScale = Math.max(minZoom, Math.min(maxZoom, oldScale + direction * zoomSpeed * oldScale));

        if (newScale === oldScale) return;

        // Zoom hacia el centro de la ventana
        const rect = this.DOMElements.appContainer.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        this.pan.x = centerX - (centerX - this.pan.x) * (newScale / oldScale);
        this.pan.y = centerY - (centerY - this.pan.y) * (newScale / oldScale);
        this.pan.scale = newScale;

        this.applyWorkspaceTransform();
        this.debounceSave();
    }

    zoomIn() { this.zoom(1); }

    zoomOut() { this.zoom(-1); }

    resetZoom() {
        this.pan.x = 0;
        this.pan.y = 0;
        this.pan.scale = 1;
        this.applyWorkspaceTransform();
        this.debounceSave();
    }

    // --- Métodos de gestión de la vista de Zoom ---

    handleNoteZoomToggle(noteId) {
        const noteInstance = this.noteInstances.get(noteId);
        const noteData = this.state.getNotes().find(n => n.id === noteId);
        if (!noteData) return;

        // NUEVO: Si la nota pertenece a una zona, abre el nuevo slider lateral.
        if (noteData.zoneId) {
            this.openZoneNotesViewer(noteId);
        } else {
            // Si es una nota independiente, usa el comportamiento de zoom anterior.
            const isZoomed = noteInstance.getDomElement().classList.contains('note-zoomed');
            if (isZoomed) {
                this.clearZoomState();
            } else {
                this.clearZoomState();
                noteInstance.getDomElement().classList.add('note-zoomed');
                this.DOMElements.body.classList.add('note-view-active');
                // El resaltado de la zona padre ya no es necesario aquí,
                // porque esta ruta solo se toma para notas sin zona.
            }
        }
    }

    clearZoomState() {
        getElement('.note-zoomed')?.classList.remove('note-zoomed');
        getElement('.parent-of-zoomed')?.classList.remove('parent-of-zoomed');
        this.DOMElements.body.classList.remove('note-view-active');
    }

    // --- Métodos para el slider de notas de zona ---

    openZoneNotesViewer(clickedNoteId) {
        const clickedNoteData = this.state.getNotes().find(n => n.id === clickedNoteId);
        if (!clickedNoteData || !clickedNoteData.zoneId) return;

        const zoneData = this.state.getZones().find(z => z.id === clickedNoteData.zoneId);
        if (!zoneData) return;

        this.currentSliderZoneId = zoneData.id; // NUEVO: Guardar el ID de la zona actual

        const notesInZone = this.state.getNotes().filter(n => n.zoneId === zoneData.id);

        this.DOMElements.sliderTitle.textContent = zoneData.title;
        const listContainer = this.DOMElements.sliderNotesList;
        listContainer.innerHTML = ''; // Limpiar

        notesInZone.forEach(noteData => {
            const activeTab = noteData.tabs[noteData.activeTabIndex || 0];
            const tabName = activeTab.name || 'Nota sin título';

            const item = document.createElement('div');
            item.className = 'slider-note-item';
            item.dataset.noteId = noteData.id;
            item.textContent = tabName;
            item.title = tabName;
            listContainer.appendChild(item);
        });

        // Renderizar el contenido de la nota en la que se hizo clic
        this.renderSliderContent(clickedNoteId);

        // Mostrar el slider
        this.DOMElements.body.classList.add('slider-active');
        this.DOMElements.body.style.overflow = 'hidden';
    }

    // NUEVO: Métodos para manejar cambios en el slider
    handleSliderContentChange(target) {
        const noteId = parseFloat(target.dataset.noteId);
        const tabIndex = parseInt(target.dataset.tabIndex);
        const content = target.value;

        const noteToUpdate = this.state.getNotes().find(n => n.id === noteId);
        if (noteToUpdate && noteToUpdate.tabs[tabIndex]) {
            noteToUpdate.tabs[tabIndex].content = content;
            this.debounceSave(); // Guarda el estado actualizado
        }
    }

    handleSliderTabNameChange(target) {
        const noteId = parseFloat(target.dataset.noteId);
        const tabIndex = parseInt(target.dataset.tabIndex);
        const newName = target.innerText;

        const noteToUpdate = this.state.getNotes().find(n => n.id === noteId);
        if (noteToUpdate && noteToUpdate.tabs[tabIndex]) {
            noteToUpdate.tabs[tabIndex].name = newName;

            // Si esta es la pestaña activa de la nota, actualiza el nombre en la lista de la izquierda
            if (noteToUpdate.activeTabIndex === tabIndex) {
                const noteListItem = this.DOMElements.sliderNotesList.querySelector(`.slider-note-item[data-note-id="${noteId}"]`);
                if (noteListItem) {
                    const displayName = newName.trim() || 'Nota sin título';
                    noteListItem.textContent = displayName;
                    noteListItem.title = displayName;
                }
            }

            this.debounceSave(); // Guarda el estado actualizado
        }
    }

    renderSliderContent(noteId) {
        // Resaltar el item activo en la lista
        this.DOMElements.sliderNotesList.querySelectorAll('.slider-note-item').forEach(item => {
            item.classList.toggle('active', parseFloat(item.dataset.noteId) === noteId);
        });

        const noteData = this.state.getNotes().find(n => n.id === noteId);
        const contentContainer = this.DOMElements.sliderNoteContent;
        contentContainer.innerHTML = ''; // Limpiar contenido anterior

        if (noteData) {
            // Crear contenedor de pestañas y paneles
            const tabsContainer = document.createElement('div');
            tabsContainer.className = 'slider-note-tabs';

            const panelsContainer = document.createElement('div');
            panelsContainer.className = 'slider-note-content-panels';

            noteData.tabs.forEach((tab, index) => {
                // Crear botón de pestaña
                const tabBtn = document.createElement('div');
                tabBtn.className = 'slider-note-tab';
                tabBtn.innerText = tab.name || `Pestaña ${index + 1}`;
                tabBtn.dataset.noteId = noteData.id;
                tabBtn.dataset.tabIndex = index;
                tabBtn.contentEditable = true;
                if (index === noteData.activeTabIndex) {
                    tabBtn.classList.add('active');
                }
                tabsContainer.appendChild(tabBtn);

                // Crear panel de contenido
                const panel = document.createElement('textarea');
                panel.className = 'slider-note-content-panel';
                panel.dataset.noteId = noteData.id;
                panel.dataset.tabIndex = index;
                panel.placeholder = "Escribe algo...";
                panel.value = tab.content || '';
                if (index === noteData.activeTabIndex) {
                    panel.classList.add('active');
                }
                panelsContainer.appendChild(panel);
            });

            contentContainer.appendChild(tabsContainer);
            contentContainer.appendChild(panelsContainer);
        } else {
            // Si no hay nota (o se borró), mostrar el mensaje por defecto
            contentContainer.appendChild(this.DOMElements.sliderNoNoteSelected);
        }
    }

    closeZoneNotesViewer() {
        this.DOMElements.body.classList.remove('slider-active');
        this.DOMElements.body.style.overflow = '';
        this.currentSliderZoneId = null; // Limpiar el ID de la zona
        // Resetear el contenido del slider para la próxima vez
        this.DOMElements.sliderNoteContent.innerHTML = '';
        this.DOMElements.sliderNoteContent.appendChild(this.DOMElements.sliderNoNoteSelected);
    }

    // NUEVO: Manejador para el botón de añadir nota en el slider
    handleSliderAddNote() {
        if (!this.currentSliderZoneId) return;
        
        const newNote = this.addNote(this.currentSliderZoneId, true); // true para indicar que es desde el slider
        if (newNote) {
            // Refrescar la vista del slider para mostrar la nueva nota y seleccionarla
            this.openZoneNotesViewer(newNote.id);
        }
    }

    // NUEVO: Proporciona el estado de pan/zoom a los componentes que lo necesiten
    getPanState() {
        return this.pan;
    }

    _getNewItemDesktopPosition(newItemIsZone = false) {
        // --- Parámetros del layout inteligente ---

        // NUEVO: Calcular el área visible del workspace en coordenadas del workspace
        const viewRect = {
            x: -this.pan.x / this.pan.scale,
            y: -this.pan.y / this.pan.scale,
            width: this.DOMElements.appContainer.clientWidth / this.pan.scale,
            height: this.DOMElements.appContainer.clientHeight / this.pan.scale
        };

        const layout = {
            // El punto de inicio de la búsqueda ahora está dentro de la vista actual
            startX: viewRect.x + 80,
            startY: viewRect.y + 80,
            gap: 30,
            columnWidth: CONSTANTS.DEFAULT_NOTE_WIDTH + 30,
            // El número de columnas se basa en el ancho visible
            numColumns: Math.max(1, Math.floor(viewRect.width / (CONSTANTS.DEFAULT_NOTE_WIDTH + 30)))
        };

        const notesOnDate = this.state.getNotes().filter(note => note.date === this.state.getSelectedDate());
        const zonesOnDate = this.state.getZones().filter(zone => zone.date === this.state.getSelectedDate());
        const topLevelItems = [
            ...notesOnDate.filter(n => !n.zoneId),
            ...zonesOnDate
        ];

        // Si no hay elementos en la fecha actual, colocar en la esquina superior de la vista.
        if (topLevelItems.length === 0) {
            return { x: layout.startX, y: layout.startY };
        }

        // Encontrar el punto más bajo de todos los elementos para saber hasta dónde buscar.
        const layoutHeight = topLevelItems.reduce((max, item) => Math.max(max, item.y + (item.height || CONSTANTS.DEFAULT_NOTE_HEIGHT)), 0);

        // El bucle de búsqueda ahora comienza desde la parte superior de la vista actual.
        // Y busca hasta el final del contenido existente o el final de la vista, lo que sea mayor.
        for (let y = layout.startY; y < Math.max(layoutHeight, viewRect.y + viewRect.height) + 1000; y += layout.gap) { // Iterar por filas
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

        // Fallback: si no se encuentra hueco, apilar al final del contenido existente, pero no por encima de la vista actual.
        const lowestPoint = topLevelItems.reduce((maxY, item) => Math.max(maxY, (item.y || 0) + (item.height || 240)), 0);
        return { x: layout.startX, y: Math.max(lowestPoint + layout.gap, layout.startY) };
    }

    // --- Métodos de Gestión de Notas/Zonas ---
    addNote(zoneId = null, fromSlider = false) {
        let position;

        if (zoneId) {
            // Lógica para añadir una nota DENTRO de una zona (funciona para móvil y escritorio)
            const parentZone = this.state.getZones().find(z => z.id === zoneId);
            if (parentZone) {
                // NUEVA LÓGICA: Colocar la nota en la primera celda vacía de la cuadrícula de la zona.
                const notesInZone = this.state.getNotes().filter(n => n.zoneId === zoneId);
                
                const numCols = 4;
                const numRows = 2;
                const grid = Array(numRows).fill(null).map(() => Array(numCols).fill(false));

                // Coordenadas y dimensiones de la cuadrícula interna de la zona
                const gridX = parentZone.x + 15;
                const gridY = parentZone.y + 45;
                const gridW = parentZone.width - 30;
                const gridH = parentZone.height - 60;
                const cellWidth = gridW / numCols;
                const cellHeight = gridH / numRows;

                // Marcar las celdas que ya están ocupadas por otras notas
                notesInZone.forEach(note => {
                    const noteCenterX = note.x + (note.width / 2);
                    const noteCenterY = note.y + (note.height / 2);
                    const relativeX = noteCenterX - gridX;
                    const relativeY = noteCenterY - gridY;
                    const col = Math.floor(relativeX / cellWidth);
                    const row = Math.floor(relativeY / cellHeight);
                    if (row >= 0 && row < numRows && col >= 0 && col < numCols) {
                        grid[row][col] = true; // Marcar celda como ocupada
                    }
                });

                // Encontrar la primera celda vacía (de arriba a abajo, de izquierda a derecha)
                let targetRow = -1, targetCol = -1;
                for (let r = 0; r < numRows; r++) {
                    for (let c = 0; c < numCols; c++) {
                        if (!grid[r][c]) {
                            targetRow = r;
                            targetCol = c;
                            break;
                        }
                    }
                    if (targetRow !== -1) break;
                }

                if (targetRow !== -1 && targetCol !== -1) {
                    // Si se encuentra una celda vacía, calcular la posición para centrar la nueva nota en ella
                    const noteWidth = CONSTANTS.DEFAULT_NOTE_WIDTH;
                    const noteHeight = CONSTANTS.DEFAULT_NOTE_HEIGHT;
                    const cellCenterX = gridX + (targetCol * cellWidth) + (cellWidth / 2);
                    const cellCenterY = gridY + (targetRow * cellHeight) + (cellHeight / 2);
                    position = {
                        x: cellCenterX - (noteWidth / 2),
                        y: cellCenterY - (noteHeight / 2)
                    };
                } else {
                    // Fallback: si la cuadrícula está llena, apilar la nota debajo de la zona para que sea visible
                    position = { x: parentZone.x, y: parentZone.y + parentZone.height + 20 };
                }
            } else {
                // Fallback si la zona no se encuentra (no debería pasar)
                position = this._getNewItemDesktopPosition(false);
            }
        } else {
            // Lógica para añadir una nota INDEPENDIENTE (funciona para móvil y escritorio)
            // Usa el layout inteligente que ahora considera la vista actual.
            position = this._getNewItemDesktopPosition(false);
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

        // Si no viene del slider, renderiza todo el workspace como antes
        if (!fromSlider) {
            this.renderWorkspace();
        }

        this.debounceSave();
        this.updateStats();
        this.widgets.calendar.render();
        if (this.mobileWidgets.calendar) this.mobileWidgets.calendar.render();

        return newNote; // Devolver la nueva nota para que el slider pueda usar su ID
    }

    addZone() {
        // La lógica es la misma para móvil y escritorio: encontrar una posición inteligente
        // que ahora considera la vista actual.
        const position = this._getNewItemDesktopPosition(true); // true porque es una zona
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

    handleNoteDrop(item) {
        const parentZoneData = this.findParentZone(item);
        item.zoneId = parentZoneData ? parentZoneData.id : null;

        if (parentZoneData) {
            // Si se suelta en una zona, calcular la posición final ajustada.
            const noteWidth = item.width || CONSTANTS.DEFAULT_NOTE_WIDTH;
            const noteHeight = item.height || CONSTANTS.DEFAULT_NOTE_HEIGHT;
            
            // Posición y tamaño de la cuadrícula en coordenadas del espacio de trabajo
            const gridX = parentZoneData.x + 15;
            const gridY = parentZoneData.y + 45;
            const gridW = parentZoneData.width - 30;
            const gridH = parentZoneData.height - 60;

            const numCols = 4;
            const numRows = 2;
            const cellWidth = gridW / numCols;
            const cellHeight = gridH / numRows;

            // Centro de la nota en coordenadas del espacio de trabajo
            const noteCenterX = item.x + noteWidth / 2;
            const noteCenterY = item.y + noteHeight / 2;

            // Posición del centro de la nota relativa a la cuadrícula
            const relativeX = noteCenterX - gridX;
            const relativeY = noteCenterY - gridY;

            const colIndex = Math.floor(relativeX / cellWidth);
            const rowIndex = Math.floor(relativeY / cellHeight);

            const clampedColIndex = Math.max(0, Math.min(colIndex, numCols - 1));
            const clampedRowIndex = Math.max(0, Math.min(rowIndex, numRows - 1));

            // Centro de la celda objetivo en coordenadas del espacio de trabajo
            const cellCenterX = gridX + (clampedColIndex * cellWidth) + (cellWidth / 2);
            const cellCenterY = gridY + (clampedRowIndex * cellHeight) + (cellHeight / 2);

            // Nueva esquina superior izquierda para que la nota se centre en la celda
            item.x = cellCenterX - (noteWidth / 2);
            item.y = cellCenterY - (noteHeight / 2);

            // MEJORA: Actualizar la posición visual del elemento DOM inmediatamente
            // para que coincida con la posición de "snap" que se va a guardar.
            const noteInstance = this.noteInstances.get(item.id);
            if (noteInstance) {
                const noteElement = noteInstance.getDomElement();
                noteElement.style.left = `${item.x}px`;
                noteElement.style.top = `${item.y}px`;
            }
        }

        this.updateNote(item);
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

    // Maneja el resaltado de zonas y el snapping a la cuadrícula mientras se arrastra una nota
    handleNoteDragMove(noteData, x, y) {
        const noteWidth = noteData.width || CONSTANTS.DEFAULT_NOTE_WIDTH;
        const noteHeight = noteData.height || CONSTANTS.DEFAULT_NOTE_HEIGHT;
        const noteCenterX = x + (noteWidth / 2);
        const noteCenterY = y + (noteHeight / 2);

        let targetZoneInstance = null;

        // Encuentra sobre qué zona se está arrastrando la nota
        const zonesInView = Array.from(this.zoneInstances.values()).filter(zone => zone.data.date === this.state.getSelectedDate());

        // Primero, determina la zona objetivo
        for (const zInstance of zonesInView) {
            const zoneData = zInstance.data;
            if (
                noteCenterX >= zoneData.x &&
                noteCenterX <= (zoneData.x + zoneData.width) &&
                noteCenterY >= zoneData.y &&
                noteCenterY <= (zoneData.y + zoneData.height)
            ) {
                targetZoneInstance = zInstance;
                break; // Se encontró una zona, no es necesario seguir buscando
            }
        }

        // Resalta la zona completa si hay una zona objetivo
        zonesInView.forEach(zone => {
            zone.getDomElement().classList.toggle('drop-target', zone === targetZoneInstance);
        });

        // Resalta la celda específica de la cuadrícula
        this.zoneInstances.forEach(zoneInstance => {
            const gridContainer = getElement('.zone-grid-container', zoneInstance.getDomElement());
            if (!gridContainer) return;
            const gridCells = Array.from(gridContainer.children);

            if (zoneInstance === targetZoneInstance) {
                const zoneData = zoneInstance.data;
                const gridX = zoneData.x + 15, gridY = zoneData.y + 45;
                const gridW = zoneData.width - 30, gridH = zoneData.height - 60;
                const numCols = 4, numRows = 2;
                const cellWidth = gridW / numCols, cellHeight = gridH / numRows;
                const relativeX = noteCenterX - gridX, relativeY = noteCenterY - gridY;
                const colIndex = Math.max(0, Math.min(Math.floor(relativeX / cellWidth), numCols - 1));
                const rowIndex = Math.max(0, Math.min(Math.floor(relativeY / cellHeight), numRows - 1));
                const targetCellIndex = rowIndex * numCols + colIndex;
                gridCells.forEach((cell, index) => cell.classList.toggle('highlight', index === targetCellIndex));
            } else {
                gridCells.forEach(cell => cell.classList.remove('highlight'));
            }
        });

        // Devuelve las coordenadas originales para permitir un movimiento libre.
        return { x, y };
    }

    // Limpia el resaltado de todas las zonas y celdas de la cuadrícula cuando se suelta una nota
    handleNoteDragStop() {
        this.zoneInstances.forEach(zone => {
            zone.getDomElement().classList.remove('drop-target');
        });
    }

    // --- Métodos de Renderización del Espacio de Trabajo ---
    renderWorkspace() {
        const isMobile = window.innerWidth <= CONSTANTS.MOBILE_BREAKPOINT;
        this.DOMElements.workspace.innerHTML = ''; // Limpiar contenido del lienzo, no todo el #app

        // Desactivar pan/zoom en móvil y activarlo en escritorio
        if (isMobile) {
            this.DOMElements.workspace.style.transform = ''; // Resetea la transformación en móvil
            this.DOMElements.appContainer.style.cursor = 'default';
            this.DOMElements.body.classList.remove('panning');
        } else {
            this.applyWorkspaceTransform(); // Aplica la transformación guardada en escritorio
            this.DOMElements.appContainer.style.cursor = 'grab';
        }


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
        this.DOMElements.workspace.appendChild(zonesContainer);
        this.DOMElements.workspace.appendChild(notesContainer);

        zonesToShow.forEach(zoneData => {
            const zone = new Zone(zoneData, {
                onDelete: this.deleteZone.bind(this),
                onUpdate: this.updateZone.bind(this),
                onAddNoteToZone: (zoneId) => this.addNote(zoneId),
                // Pasar el getter del estado de pan/zoom
                getPanState: this.getPanState.bind(this)
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
                findParentZone: this.findParentZone.bind(this),
                onNoteDragMove: this.handleNoteDragMove.bind(this),
                onNoteDragStop: this.handleNoteDragStop.bind(this),
                onNoteDrop: this.handleNoteDrop.bind(this),
                onZoomToggle: this.handleNoteZoomToggle.bind(this),
                getPanState: this.getPanState.bind(this)
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
                findParentZone: this.findParentZone.bind(this),
                // onNoteDragMove ahora espera un retorno de coordenadas
                onNoteDragMove: this.handleNoteDragMove.bind(this),
                onNoteDragStop: this.handleNoteDragStop.bind(this)
                });
                this.noteInstances.set(noteData.id, note);
                notesContainer.appendChild(note.getDomElement());
            });
            this.DOMElements.workspace.appendChild(standaloneSection);
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
                    onAddNoteToZone: (zoneId) => this.addNote(zoneId)
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
            this.DOMElements.workspace.appendChild(zonesSection);
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
        const allNotes = this.state.getNotes();
        const totalNotes = allNotes.length;

        // Obtener la fecha de hoy en formato YYYY-MM-DD
        const today = new Date();
        const todayDateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        const notesForToday = allNotes.filter(note => note.date === todayDateString).length;
        const undatedNotes = allNotes.filter(note => !note.date).length;

        // Actualizar los contadores en ambos dashboards (principal y móvil)
        getElements('#note-count-total').forEach(el => el.textContent = totalNotes);
        getElements('#note-count-today').forEach(el => el.textContent = notesForToday);
        getElements('#note-count-undated').forEach(el => el.textContent = undatedNotes);
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
                    : 'Tablero General'; // Si no tiene fecha, es del tablero general
                
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
        // La URL ya está en AppState. Este callback ahora gestiona el historial.

        // 1. Actualizar el historial
        const history = this.state.youtubeUrlHistory || [];
        const YOUTUBE_HISTORY_LIMIT = 10;

        // Crear una nueva copia para trabajar con ella
        let newHistory = [...history];

        // Eliminar la URL si ya existe para moverla al principio
        const existingIndex = newHistory.findIndex(item => item === url);
        if (existingIndex > -1) {
            newHistory.splice(existingIndex, 1);
        }

        // Añadir la URL al principio
        newHistory.unshift(url);

        // Limitar el tamaño del historial
        if (newHistory.length > YOUTUBE_HISTORY_LIMIT) {
            newHistory = newHistory.slice(0, YOUTUBE_HISTORY_LIMIT);
        }

        this.state.youtubeUrlHistory = newHistory; // Actualizar el estado

        // 2. Re-renderizar el historial en los widgets
        this.widgets.youtube.renderHistory();
        if (this.mobileWidgets.youtube) this.mobileWidgets.youtube.renderHistory();

        // 3. Guardar los datos
        this.debounceSave();
    }
}

// Inicializa la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Primero, inicializa el monitoreo de red, ya que crea un elemento DOM global.
    initNetworkStatusMonitor();

    // NUEVO: Inicializa la animación del cielo en la pantalla de login.
    initSkyAnimation();

    // Luego, inicializa el resto de tu aplicación.
    const appInstance = new App();
    appInstance.init();
});
