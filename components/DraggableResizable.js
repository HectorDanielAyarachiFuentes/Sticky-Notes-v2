// components/DraggableResizable.js
import { getElement } from "../utils/dom.js";
import { CONSTANTS } from "../config.js";

export function makeDraggable(element, item, callbacks) {
    const { onDragEnd, onDragMove, onDragStop, getPanState } = callbacks || {};

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

        // Obtener el estado actual de pan/zoom. Por defecto si no se proporciona.
        const panState = getPanState ? getPanState() : { x: 0, y: 0, scale: 1 };

        // Posición inicial del elemento en coordenadas del espacio de trabajo
        const startItemX = item.x;
        const startItemY = item.y;
        
        // Posición inicial del ratón en coordenadas de la ventana
        const initialMouseX = e.clientX;
        const initialMouseY = e.clientY;

        // NUEVO: Variables para almacenar la última posición calculada.
        let finalX = startItemX;
        let finalY = startItemY;

        const onMouseMove = (moveEvent) => {
            // Calcular el delta del ratón en coordenadas de la ventana
            const dx = moveEvent.clientX - initialMouseX;
            const dy = moveEvent.clientY - initialMouseY;

            // Convertir el delta de la ventana al delta del espacio de trabajo escalando
            const workspaceDx = dx / panState.scale;
            const workspaceDy = dy / panState.scale;

            // Calcular la nueva posición en coordenadas del espacio de trabajo
            let newX = startItemX + workspaceDx;
            let newY = startItemY + workspaceDy;

            // Opcional: Limitar a coordenadas no negativas.
            newX = Math.max(0, newX);
            newY = Math.max(0, newY);

            // Guardar la posición calculada para usarla en mouseup
            finalX = newX;
            finalY = newY;

            if (onDragMove) {
                // onDragMove ahora devuelve las coordenadas a usar, ya sean ajustadas o no.
                // Si devuelve nulo/indefinido, usamos las calculadas.
                const newCoords = onDragMove(newX, newY);
                if (newCoords && typeof newCoords.x === 'number' && typeof newCoords.y === 'number') {
                    element.style.left = `${newCoords.x}px`;
                    element.style.top = `${newCoords.y}px`;
                } else {
                    element.style.left = `${newX}px`;
                    element.style.top = `${newY}px`;
                }
            } else {
                // Si no hay onDragMove, simplemente aplicar la posición calculada
                element.style.left = `${newX}px`;
                element.style.top = `${newY}px`;
            }
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            element.classList.remove('dragging');

            // MEJORA: Usar la última posición calculada directamente en lugar de leer del DOM.
            // Esto es más robusto y evita posibles discrepancias por redondeo del navegador.
            item.x = finalX;
            item.y = finalY;

            if (onDragEnd) {
                onDragEnd(item);
            }
            if (onDragStop) {
                onDragStop();
            }
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