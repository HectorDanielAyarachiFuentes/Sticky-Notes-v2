// utils/dom.js

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

// Puedes añadir más helpers DOM aquí si son genéricos y se usan en varios lugares