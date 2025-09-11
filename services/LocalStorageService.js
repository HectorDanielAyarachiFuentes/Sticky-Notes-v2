// services/LocalStorageService.js
import { CONSTANTS } from "../config.js";

/**
 * Un servicio que simula la interfaz de FirestoreService pero utiliza
 * el localStorage del navegador para persistencia de datos.
 * Ideal para desarrollo offline y pruebas locales.
 */
class LocalStorageService {
    constructor() {
        this.storageKey = 'localUserData';
    }

    async loadUserData(uid) { // El uid se ignora en modo local
        const dataJSON = localStorage.getItem(this.storageKey);
        if (!dataJSON) {
            return { notes: [], zones: [], youtubeUrl: '', youtubeUrlHistory: [], panX: 0, panY: 0, zoom: 1 };
        }

        const data = JSON.parse(dataJSON);
        // Reutilizamos la lógica de migración de datos para consistencia
        let loadedNotes = data.notes || [];
        loadedNotes.forEach(note => {
            if (note.content !== undefined && !note.tabs) {
                note.tabs = Array(5).fill(null).map((_, i) => ({ name: `Nota ${i+1}`, content: i === 0 ? note.content : '' }));
                note.activeTabIndex = 0;
                delete note.content;
            }
            if (note.width === undefined) { note.width = CONSTANTS.DEFAULT_NOTE_WIDTH; }
            if (note.height === undefined) { note.height = CONSTANTS.DEFAULT_NOTE_HEIGHT; }
        });
        return { 
            notes: loadedNotes, 
            zones: data.zones || [], 
            youtubeUrl: data.youtubeUrl || '',
            youtubeUrlHistory: data.youtubeUrlHistory || [],
            panX: data.panX || 0,
            panY: data.panY || 0,
            zoom: data.zoom || 1
        };
    }

    async saveUserData(uid, data) { // El uid se ignora en modo local
        localStorage.setItem(this.storageKey, JSON.stringify(data));
    }
}

export default LocalStorageService;