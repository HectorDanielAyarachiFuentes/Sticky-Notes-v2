// components/Zone.js
import { makeDraggable, makeResizable } from "./DraggableResizable.js";
import { getElement } from "../utils/dom.js";
import { CONSTANTS } from "../config.js";

class Zone {
    constructor(zoneData, callbacks) {
        this.data = zoneData;
        this.callbacks = callbacks; // { onDelete, onUpdate, onAddNoteToZone }
        this.element = this.createDomElement();
        this.bindEvents();
    }

    createDomElement() {
        const element = document.createElement('div');
        element.className = 'zone';
        element.id = `zone-${this.data.id}`;
        // CAMBIO: Se reemplaza el <input> por un <h4> editable para consistencia con las notas.
        // Se usa data-placeholder para el estilo CSS.
        element.innerHTML = `
            <h4 class="zone-title" contenteditable="true" data-placeholder="Título de la Zona">${this.data.title}</h4>
            <div class="zone-actions">
                <button class="organize-zone-btn" title="Organizar notas automáticamente">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.21 1.21 0 0 0 1.72 0L21.64 5.36a1.21 1.21 0 0 0 0-1.72Z"/><path d="m14 7 3 3"/><path d="M5 6v1"/><path d="M11 2v2"/><path d="M15 11h1"/><path d="M8 11v1"/><path d="M3 11h1"/></svg>
                </button>
                <button class="add-note-in-zone-btn" title="Añadir Nota a Zona">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                </button>
                <button class="view-full-zone-btn" title="Ver Pantalla Completa">
                    <svg class="maximize-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
                    <span class="btn-text">Ver Zona</span>
                </button>
                <button class="delete-zone-btn" title="Eliminar Zona">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
                </button>
            </div>
            <div class="resize-handle"></div>
            <div class="zone-grid-container">
                ${Array(8).fill().map((_, i) => `<div class="zone-grid-cell" data-cell-index="${i}"></div>`).join('')}
            </div>
            <div class="zone-notes-container-desktop"></div>
            <div class="zone-notes-container-mobile"></div>
        `;
        if (window.innerWidth > 768) {
            element.classList.add('draggable');
            element.style.left = `${this.data.x || 50}px`;
            element.style.top = `${this.data.y || 50}px`;
            element.style.width = `${this.data.width || CONSTANTS.DEFAULT_ZONE_WIDTH}px`;
            element.style.height = `${this.data.height || CONSTANTS.DEFAULT_ZONE_HEIGHT}px`;
        }
        return element;
    }

    bindEvents() {
        // CAMBIO: El evento ahora escucha cambios en un elemento 'contenteditable' y usa 'innerText'.
        getElement('.zone-title', this.element).addEventListener('input', e => {
            this.data.title = e.target.innerText;
            this.callbacks.onUpdate(this.data);
        });

        getElement('.delete-zone-btn', this.element).addEventListener('click', () => this.callbacks.onDelete(this.data.id));

        getElement('.add-note-in-zone-btn', this.element).addEventListener('click', () => {
            this.callbacks.onAddNoteToZone(this.data.id);
        });

        getElement('.organize-zone-btn', this.element).addEventListener('click', () => {
            if (this.callbacks.onOrganizeNotes) this.callbacks.onOrganizeNotes(this.data.id);
        });

        const viewFullBtn = getElement('.view-full-zone-btn', this.element);
        viewFullBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isFullscreen = this.element.classList.toggle('zone-fullscreen');
            document.body.classList.toggle('zone-view-active');
            
            const btnText = viewFullBtn.querySelector('.btn-text');
            if (btnText) btnText.textContent = isFullscreen ? 'Cerrar' : 'Ver Zona';
            
            if (isFullscreen) {
                this.element.scrollTop = 0;
            }
        });

        if (window.innerWidth > 768) {
            makeDraggable(this.element, this.data, {
                onDragEnd: this.callbacks.onUpdate,
                getPanState: this.callbacks.getPanState
            });
            makeResizable(this.element, this.data, this.callbacks.onUpdate);
        }
    }

    getDomElement() {
        return this.element;
    }
}

export default Zone;