// components/Note.js
import { makeDraggable, makeResizable } from "./DraggableResizable.js";
import { getElement, getElements, autoResizeTextarea } from "../utils/dom.js";
import { CONSTANTS } from "../config.js";

class Note {
    constructor(noteData, callbacks) {
        this.data = noteData;
        this.callbacks = callbacks; // { onDelete, onUpdate, findParentZone, onZoomToggle, ... }
        this.element = this.createDomElement();
        this.bindEvents();
        this.renderTabs(); // Render initial tabs/content
    }

    createDomElement() {
        const element = document.createElement('div');
        element.className = 'note';
        element.id = `note-${this.data.id}`; // Add ID for easier selection if needed
        element.innerHTML = `
            <div class="note-tabs"></div>
            <div class="note-main-content">
                <div class="note-header">
                    <h4 class="tab-name-display" contenteditable="true" title="Haz clic para editar el nombre de la pestaña"></h4>
                    <div class="header-actions">
                        <button class="note-zoom-handle" title="Ampliar nota">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
                        </button>
                        <button class="delete-btn" title="Eliminar nota">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                </div>
                <div class="note-content-panels"></div>
            </div>
            <div class="resize-handle"></div>
        `;

        // En escritorio, las notas son draggables y tienen posición absoluta.
        if (window.innerWidth > CONSTANTS.MOBILE_BREAKPOINT) {
            element.classList.add('draggable');
            // Aplicar siempre la posición y tamaño para el layout de escritorio
            element.style.left = `${this.data.x || 20}px`;
            element.style.top = `${this.data.y || 20}px`;
            element.style.width = `${this.data.width || CONSTANTS.DEFAULT_NOTE_WIDTH}px`;
            element.style.height = `${this.data.height || CONSTANTS.DEFAULT_NOTE_HEIGHT}px`;

            if (this.data.zoneId) {
                element.classList.add('is-in-zone');
            }
        }
        return element;
    }

    renderTabs() {
        const tabsContainer = getElement('.note-tabs', this.element);
        const contentPanels = getElement('.note-content-panels', this.element);
        const tabNameDisplay = getElement('.tab-name-display', this.element);

        tabsContainer.innerHTML = '';
        contentPanels.innerHTML = '';

        this.data.tabs.forEach((tab, index) => {
            const tabBtn = document.createElement('button');
            tabBtn.className = 'note-tab-btn';
            tabBtn.dataset.index = index;
            tabBtn.title = tab.name;
            if (index === this.data.activeTabIndex) {
                tabBtn.classList.add('active');
                tabNameDisplay.innerText = tab.name;
            }
            tabsContainer.appendChild(tabBtn);

            const contentPanel = document.createElement('div');
            contentPanel.className = 'note-content-panel';
            contentPanel.dataset.index = index;
            if (index === this.data.activeTabIndex) contentPanel.classList.add('active');

            const textarea = document.createElement('textarea');
            textarea.placeholder = "Escribe algo...";
            textarea.value = tab.content || '';
            contentPanel.appendChild(textarea);
            if (window.innerWidth <= 768) autoResizeTextarea(textarea);

            contentPanels.appendChild(contentPanel);
        });
    }

    bindEvents() {
        const tabsContainer = getElement('.note-tabs', this.element);
        const contentPanels = getElement('.note-content-panels', this.element);
        const tabNameDisplay = getElement('.tab-name-display', this.element);
        const deleteBtn = getElement('.delete-btn', this.element);

        tabsContainer.addEventListener('click', (e) => {
            const clickedTab = e.target.closest('.note-tab-btn');
            if (!clickedTab) return;

            // NUEVA LÓGICA: Si la nota está ampliada, cualquier clic en las pestañas
            // no debe propagarse al 'document', para evitar que se cierre la vista de zoom.
            if (this.element.classList.contains('note-zoomed')) {
                e.stopPropagation();
            }

            const newIndex = parseInt(clickedTab.dataset.index);
            this.data.activeTabIndex = newIndex;
            this.renderTabs(); // Re-render to update active classes and display name
            this.callbacks.onUpdate(this.data);
        });

        tabNameDisplay.addEventListener('input', () => {
            const activeTab = this.data.tabs[this.data.activeTabIndex];
            activeTab.name = tabNameDisplay.innerText;
            getElement(`.note-tab-btn[data-index="${this.data.activeTabIndex}"]`, tabsContainer).title = activeTab.name;
            this.callbacks.onUpdate(this.data);
        });

        contentPanels.addEventListener('input', e => {
            const target = e.target;
            if (target.tagName.toLowerCase() === 'textarea') {
                const panelIndex = parseInt(target.closest('.note-content-panel').dataset.index);
                this.data.tabs[panelIndex].content = target.value;
                if (window.innerWidth <= 768) autoResizeTextarea(target);
                this.callbacks.onUpdate(this.data);
            }
        });

        deleteBtn.addEventListener('click', () => this.callbacks.onDelete(this.data.id));

        // En escritorio, todas las notas son arrastrables y redimensionables.
        if (window.innerWidth > CONSTANTS.MOBILE_BREAKPOINT) {
            makeDraggable(this.element, this.data, {
                onDragMove: (x, y) => {
                    if (this.callbacks.onNoteDragMove) {
                        // Pasa la posición actual y recibe la posición ajustada (snapped)
                        return this.callbacks.onNoteDragMove(this.data, x, y) || { x, y };
                    }
                    return { x, y }; // Devuelve las originales si no hay callback o no hay snapping
                },
                onDragEnd: (item) => {
                    // El nuevo manejador se encargará de encontrar el padre, ajustar y actualizar.
                    if (this.callbacks.onNoteDrop) this.callbacks.onNoteDrop(item);
                },
                onDragStop: () => {
                    if (this.callbacks.onNoteDragStop) {
                        this.callbacks.onNoteDragStop();
                    }
                },
                getPanState: this.callbacks.getPanState
            });
            // La redimensión se mantiene igual
            makeResizable(this.element, this.data, this.callbacks.onUpdate);
        }

        // Añadir evento de clic para zoom/expandir (funciona en móvil y escritorio)
        const zoomHandle = getElement('.note-zoom-handle', this.element);
        if (zoomHandle) {
            zoomHandle.addEventListener('click', (e) => {
                // Detener la propagación para evitar que otros listeners (como el de arrastre) se activen.
                e.stopPropagation();
                // Notificar a la app principal para que gestione el estado del zoom de forma centralizada
                if (this.callbacks.onZoomToggle) this.callbacks.onZoomToggle(this.data.id);
            });
        }
    }

    getDomElement() {
        return this.element;
    }
}

export default Note;