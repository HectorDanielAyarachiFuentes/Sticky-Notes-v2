// project/utils/dom.js

export function getElement(selector, parent = document) {
    return parent.querySelector(selector);
}

export function getElements(selector, parent = document) {
    return parent.querySelectorAll(selector);
}

export function autoResizeTextarea(element) {
    element.style.height = 'auto';
    element.style.height = (element.scrollHeight) + 'px';
}

/**
 * Crea un nuevo elemento DOM con opcionales clases y contenido de texto.
 * @param {string} tagName - El nombre de la etiqueta del elemento a crear (ej. 'div', 'span').
 * @param {string} [className=''] - Una cadena de clases CSS a añadir al elemento.
 * @param {string} [textContent=''] - El contenido de texto para el elemento.
 * @returns {HTMLElement} El elemento DOM creado.
 */
export function createElement(tagName, className = '', textContent = '') {
    const element = document.createElement(tagName);
    if (className) {
        element.className = className;
    }
    if (textContent) {
        element.textContent = textContent;
    }
    return element;
}

// Puedes añadir más helpers DOM aquí si son genéricos y se usan en varios lugares