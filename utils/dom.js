// project/utils/dom.js

/**
 * Obtiene un elemento del DOM.
 * @param {string} selector - Selector CSS del elemento.
 * @param {Element|Document} [parent=document] - Elemento padre donde buscar.
 * @returns {Element|null} El elemento encontrado o null si no existe.
 */
export function getElement(selector, parent = document) {
    const element = parent.querySelector(selector);
    // console.log(`Searching for: ${selector} in`, parent, `Found:`, element); // Para depuración
    return element;
}

/**
 * Obtiene todos los elementos del DOM que coinciden con un selector.
 * @param {string} selector - Selector CSS de los elementos.
 * @param {Element|Document} [parent=document] - Elemento padre donde buscar.
 * @returns {Array<Element>} Una lista de nodos (convertida a array) de los elementos encontrados.
 */
export function getElements(selector, parent = document) {
    return Array.from(parent.querySelectorAll(selector));
}

/**
 * Crea un nuevo elemento DOM.
 * @param {string} tagName - El nombre de la etiqueta HTML a crear (ej. 'div', 'span').
 * @param {string|string[]} [classNames=[]] - Una cadena o un array de nombres de clase para el elemento.
 * @param {string} [id=null] - Un ID para el elemento.
 * @returns {HTMLElement} El elemento HTML recién creado.
 */
export function createElement(tagName, classNames = [], id = null) {
    const element = document.createElement(tagName);
    if (Array.isArray(classNames)) {
        element.classList.add(...classNames);
    } else if (typeof classNames === 'string' && classNames.length > 0) {
        element.classList.add(classNames);
    }
    if (id) {
        element.id = id;
    }
    return element;
}