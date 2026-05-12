// config.js
export const firebaseConfig = {
  apiKey: "AIzaSyDoS6KrY6V84IOed-1ePmsbLCUHCQWoY0g",
  authDomain: "sticky-notes-v2-f352a.firebaseapp.com",
  projectId: "sticky-notes-v2-f352a",
  storageBucket: "sticky-notes-v2-f352a.appspot.com", // Corregido para usar el dominio correcto de storage
  messagingSenderId: "1093833168954",
  appId: "1:1093833168954:web:60cc9646d43f891ecc3d03",
  measurementId: "G-331DWMF8ZR"
};

// INTERRUPTOR DE MODO:
// Se fuerza el uso de Firebase por defecto, eliminando la lógica de detección de entorno local.
// Se establece en false para permitir el uso local sin conexión a Firebase.
// Cámbialo a true si deseas sincronizar con la nube.
export const USE_FIREBASE = true;

export const CONSTANTS = {
  TIMER_LS_KEY: 'timerData',
  DEFAULT_NOTE_WIDTH: 320,
  DEFAULT_NOTE_HEIGHT: 240,
  DEFAULT_ZONE_WIDTH: 400,
  DEFAULT_ZONE_HEIGHT: 300,
  MIN_NOTE_WIDTH: 250,
  MIN_NOTE_HEIGHT: 200,
  ICONS: {
    PLAY: `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"></path></svg>`,
    PAUSE: `<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" fill="currentColor"></path></svg>`
  },
  MOBILE_BREAKPOINT: 768
};