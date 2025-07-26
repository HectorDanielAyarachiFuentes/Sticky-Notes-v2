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
            <span class="delete-btn">×</span>
            <button class="add-note-in-zone-btn" title="Añadir Nota a Zona">+</button>
            <button class="view-full-zone-btn">Ver Zona</button>
            <div class="resize-handle"></div>
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

        getElement('.delete-btn', this.element).addEventListener('click', () => this.callbacks.onDelete(this.data.id));

        getElement('.add-note-in-zone-btn', this.element).addEventListener('click', () => {
            this.callbacks.onAddNoteToZone(this.data.id);
        });

        const viewFullBtn = getElement('.view-full-zone-btn', this.element);
        viewFullBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isFullscreen = this.element.classList.toggle('zone-fullscreen');
            document.body.classList.toggle('zone-view-active');
            viewFullBtn.textContent = isFullscreen ? 'Cerrar' : 'Ver Zona';
            if (isFullscreen) {
                this.element.scrollTop = 0;
            }
        });

        if (window.innerWidth > 768) {
            makeDraggable(this.element, this.data, this.callbacks.onUpdate);
            makeResizable(this.element, this.data, this.callbacks.onUpdate);
        }
    }

    getDomElement() {
        return this.element;
    }
}

export default Zone;