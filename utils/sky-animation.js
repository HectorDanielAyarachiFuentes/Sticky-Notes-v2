// utils/sky-animation.js

import { getElement } from './dom.js';

// --- Elementos cacheados ---
let sun, moon, starsContainer, skyBG, clouds, skyGradientStop1, skyGradientStop2, skyGradientStop3;
let animationFrameId = null;

// --- Configuración ---
const STAR_COUNT = 150;

// --- Paletas de colores para el gradiente del cielo ---
const skyColors = {
    night: ['#020617', '#0f172a', '#1e293b'],
    dawn: ['#1e293b', '#3730a3', '#fbbf24'],
    day: ['#bae6fd', '#7dd3fc', '#38bdf8'], // Tonos más vivos (Sky 200, 300, 400)
    dusk: ['#1e293b', '#3730a3', '#fbbf24'] 
};

/**
 * Interpola linealmente entre dos colores.
 */
function lerpColor(color1, color2, factor) {
    const r1 = parseInt(color1.substring(1, 3), 16);
    const g1 = parseInt(color1.substring(3, 5), 16);
    const b1 = parseInt(color1.substring(5, 7), 16);

    const r2 = parseInt(color2.substring(1, 3), 16);
    const g2 = parseInt(color2.substring(3, 5), 16);
    const b2 = parseInt(color2.substring(5, 7), 16);

    const r = Math.round(r1 + factor * (r2 - r1));
    const g = Math.round(g1 + factor * (g2 - g1));
    const b = Math.round(b1 + factor * (b2 - b1));

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Genera estrellas en posiciones aleatorias.
 */
function createStars() {
    if (!starsContainer) return;
    let starsHTML = '';
    for (let i = 0; i < STAR_COUNT; i++) {
        const x = Math.random() * 100;
        const y = Math.random() * 80; // No poner estrellas muy abajo
        const r = Math.random() * 1.2 + 0.5;
        const delay = Math.random() * 4;
        starsHTML += `<circle cx="${x}%" cy="${y}%" r="${r}" style="animation-delay: ${delay}s;"></circle>`;
    }
    starsContainer.innerHTML = starsHTML;
}

/**
 * Actualiza la apariencia del cielo según la hora del día.
 */
function updateSky() {
    const now = new Date();
    const hour = now.getHours() + now.getMinutes() / 60;

    let c1, c2, c3;
    let factor;

    // --- Posicionamiento y visibilidad ---
    if (hour >= 6 && hour < 18) { // Es de día
        const dayProgress = (hour - 6) / 12; // 0 en 6am, 1 en 6pm
        const x = dayProgress * 100;
        const y = 70 - Math.sin(dayProgress * Math.PI) * 50; // Arco
        sun.setAttribute('cx', `${x}%`);
        sun.setAttribute('cy', `${y}%`);
        moon.setAttribute('opacity', 0);
    } else { // Es de noche
        let nightProgress;
        if (hour >= 18) {
            nightProgress = (hour - 18) / 12;
        } else { // 0am a 5:59am
            nightProgress = (hour + 6) / 12;
        }
        const x = nightProgress * 100;
        const y = 70 - Math.sin(nightProgress * Math.PI) * 50; // Arco
        moon.setAttribute('cx', `${x}%`);
        moon.setAttribute('cy', `${y}%`);
        sun.setAttribute('opacity', 0);
    }

    // --- Colores y opacidades ---
    if (hour >= 5 && hour < 7) { // Amanecer (5:00 - 6:59)
        factor = (hour - 5) / 2; // 0 a 1 durante 2 horas
        c1 = lerpColor(skyColors.night[0], skyColors.dawn[0], factor);
        c2 = lerpColor(skyColors.night[1], skyColors.dawn[1], factor);
        c3 = lerpColor(skyColors.night[2], skyColors.dawn[2], factor);
        sun.setAttribute('opacity', factor);
        moon.setAttribute('opacity', 1 - factor);
        starsContainer.style.opacity = 1 - factor;
        clouds.style.opacity = 0.4 + 0.3 * factor; // Nubes aparecen suavemente
    } else if (hour >= 7 && hour < 18) { // Día (7:00 - 17:59)
        c1 = skyColors.day[0];
        c2 = skyColors.day[1];
        c3 = skyColors.day[2];
        sun.setAttribute('opacity', 1);
        moon.setAttribute('opacity', 0);
        starsContainer.style.opacity = 0;
        clouds.style.opacity = 0.7; // Nubes presentes pero no tapan todo
    } else if (hour >= 18 && hour < 20) { // Atardecer (18:00 - 19:59)
        factor = (hour - 18) / 2; // 0 a 1 durante 2 horas
        c1 = lerpColor(skyColors.dusk[0], skyColors.night[0], factor);
        c2 = lerpColor(skyColors.dusk[1], skyColors.night[1], factor);
        c3 = lerpColor(skyColors.dusk[2], skyColors.night[2], factor);
        sun.setAttribute('opacity', 1 - factor);
        moon.setAttribute('opacity', factor);
        starsContainer.style.opacity = factor;
        clouds.style.opacity = 0.7 - 0.3 * factor; // Nubes se desvanecen
    } else { // Noche
        c1 = skyColors.night[0];
        c2 = skyColors.night[1];
        c3 = skyColors.night[2];
        sun.setAttribute('opacity', 0);
        moon.setAttribute('opacity', 1);
        starsContainer.style.opacity = 1;
        clouds.style.opacity = 0.4; // Nubes tenues nocturnas
    }

    // Aplicar colores al gradiente
    skyGradientStop1.setAttribute('stop-color', c1);
    skyGradientStop2.setAttribute('stop-color', c2);
    skyGradientStop3.setAttribute('stop-color', c3);

    animationFrameId = requestAnimationFrame(updateSky);
}

/**
 * Detiene la animación del cielo.
 */
function stopSkyAnimation() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

/**
 * Inicializa la animación del cielo.
 */
export function initSkyAnimation() {
    // Detener cualquier animación anterior para evitar bucles duplicados
    stopSkyAnimation();

    sun = getElement('#sun');
    moon = getElement('#moon');
    starsContainer = getElement('#stars');
    skyBG = getElement('#skyBG');
    clouds = getElement('#clouds');
    skyGradientStop1 = getElement('#skyGradient-stop1');
    skyGradientStop2 = getElement('#skyGradient-stop2');
    skyGradientStop3 = getElement('#skyGradient-stop3');

    if (!sun || !moon || !starsContainer || !skyBG || !clouds || !skyGradientStop1) {
        console.error("Sky Animation: Faltan elementos SVG esenciales.");
        return;
    }

    createStars();
    updateSky(); // Inicia el bucle de animación
}