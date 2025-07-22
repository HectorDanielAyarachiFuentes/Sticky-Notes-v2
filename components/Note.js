// components/Note.js
import { makeDraggable, makeResizable } from "./DraggableResizable.js";
import { getElement, getElements, autoResizeTextarea } from "../utils/dom.js";
import { CONSTANTS } from "../config.js";

class Note {
    constructor(noteData, callbacks) {
        this.data = noteData;
        this.callbacks = callbacks; // { onDelete, onUpdate, findParentZone }
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
                    <h4 class="tab-name-display" contenteditable="true"></h4>
                    <button class="delete-btn">×</button>
                </div>
                <div class="note-content-panels"></div>
            </div>
            <div class="resize-handle"></div>
        `;

        if (window.innerWidth > 768) {
            element.classList.add('draggable');
            element.style.left = `${this.data.x || 20}px`;
            element.style.top = `${this.data.y || 20}px`;
            element.style.width = `${this.data.width || CONSTANTS.DEFAULT_NOTE_WIDTH}px`;
            element.style.height = `${this.data.height || CONSTANTS.DEFAULT_NOTE_HEIGHT}px`;
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

        if (window.innerWidth > 768) {
            makeDraggable(this.element, this.data, (item) => {
                const parentZone = this.callbacks.findParentZone(item);
                item.zoneId = parentZone ? parentZone.id : null;
                this.callbacks.onUpdate(item);
            });
            makeResizable(this.element, this.data, this.callbacks.onUpdate);
        }
    }

    getDomElement() {
        return this.element;
    }
}

export default Note;