// components/DraggableResizable.js
import { getElement } from "../utils/dom.js";
import { CONSTANTS } from "../config.js";

export function makeDraggable(element, item, onDragEndCallback) {
    element.addEventListener('mousedown', e => {
        const target = e.target;
        // Evitar arrastrar si se hace clic en textareas, inputs, elementos editables, botones de borrar o handles de redimensionar
        if (target.isContentEditable ||
            target.tagName.toLowerCase() === 'textarea' ||
            target.tagName.toLowerCase() === 'input' ||
            target.classList.contains('delete-btn') ||
            target.classList.contains('resize-handle')) {
            return;
        }

        e.preventDefault(); // Previene la selección de texto
        element.classList.add('dragging');

        const offsetX = e.clientX - element.getBoundingClientRect().left;
        const offsetY = e.clientY - element.getBoundingClientRect().top;

        const onMouseMove = (moveEvent) => {
            let newX = moveEvent.clientX - offsetX;
            let newY = moveEvent.clientY - offsetY;

            const appRect = getElement('#app').getBoundingClientRect(); // Necesita saber el contenedor
            
            // Limitar el movimiento dentro de los límites del contenedor
            newX = Math.max(0, Math.min(newX, appRect.width - element.offsetWidth));
            newY = Math.max(0, Math.min(newY, appRect.height - element.offsetHeight));

            element.style.left = `${newX}px`;
            element.style.top = `${newY}px`;
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            element.classList.remove('dragging');
            item.x = parseInt(element.style.left);
            item.y = parseInt(element.style.top);
            onDragEndCallback(item);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
}

export function makeResizable(element, item, onResizeEndCallback) {
    const handle = getElement('.resize-handle', element);
    if (!handle) return;

    handle.addEventListener('mousedown', e => {
        e.stopPropagation(); // Evita que se active el evento de arrastrar del padre
        e.preventDefault(); // Previene la selección de texto

        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = parseInt(document.defaultView.getComputedStyle(element).width, 10);
        const startHeight = parseInt(document.defaultView.getComputedStyle(element).height, 10);

        const onMouseMove = (moveEvent) => {
            let newWidth = startWidth + moveEvent.clientX - startX;
            let newHeight = startHeight + moveEvent.clientY - startY;

            element.style.width = `${Math.max(CONSTANTS.MIN_NOTE_WIDTH, newWidth)}px`; // Usar constantes para mínimos
            element.style.height = `${Math.max(CONSTANTS.MIN_NOTE_HEIGHT, newHeight)}px`;
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            item.width = parseInt(element.style.width);
            item.height = parseInt(element.style.height);
            onResizeEndCallback(item);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
}