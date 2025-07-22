// project/widgets/StatsWidget.js

import { getElement, createElement } from '../utils/dom.js';

class StatsWidget {
    constructor(containerSelector, appState) {
        this.container = getElement(containerSelector);
        if (!this.container) {
            console.error(`StatsWidget: Contenedor no encontrado con el selector ${containerSelector}`);
            return;
        }

        this.appState = appState;
        this.noteCountEl = null; // Se inicializará después de crear el elemento

        this._createElement(); // Crea la estructura HTML del widget
        this._setupListeners(); // Configura los listeners para AppState
        this.render(); // Renderiza el widget por primera vez
    }

    _createElement() {
        // Asegúrate de que el contenedor esté vacío antes de añadir el contenido del widget
        this.container.innerHTML = ''; 

        // Estructura del HTML para el widget de estadísticas
        const titleEl = createElement('h3');
        titleEl.textContent = 'Notas';

        this.noteCountEl = createElement('span', '', 'stats-note-count'); // Un ID más específico
        this.noteCountEl.id = 'stats-note-count'; // Asigna un ID específico al span

        this.container.appendChild(titleEl);
        this.container.appendChild(this.noteCountEl);
    }

    _setupListeners() {
        // El widget debe reaccionar cuando:
        // 1. La lista de notas cambia (añadir, eliminar, cargar)
        // 2. La fecha seleccionada en el calendario cambia
        this.appState.on('notesChanged', this.render.bind(this));
        this.appState.on('selectedDateChanged', this.render.bind(this));
    }

    render() {
        if (!this.noteCountEl) return; // Asegurarse de que el elemento exista

        const notesInView = this.appState.getNotes().filter(n => n.date === this.appState.getSelectedDate()).length;
        this.noteCountEl.textContent = notesInView;
    }
}

export default StatsWidget;