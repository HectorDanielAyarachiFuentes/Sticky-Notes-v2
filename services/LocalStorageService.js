// services/LocalStorageService.js
class LocalStorageService {
    constructor() {
        this.storageKeyPrefix = 'sticky_notes_data_';
    }

    async loadUserData(uid) {
        const dataJSON = localStorage.getItem(this.storageKeyPrefix + uid);
        if (dataJSON) {
            try {
                const data = JSON.parse(dataJSON);
                return {
                    notes: data.notes || [],
                    zones: data.zones || [],
                    youtubeUrl: data.youtubeUrl || '',
                    youtubeUrlHistory: data.youtubeUrlHistory || [],
                    panX: data.panX || 0,
                    panY: data.panY || 0,
                    zoom: data.zoom || 1
                };
            } catch (e) {
                console.error("Error parsing local data:", e);
                return { notes: [], zones: [], youtubeUrl: '' };
            }
        }
        return { notes: [], zones: [], youtubeUrl: '' };
    }

    async saveUserData(uid, data) {
        try {
            localStorage.setItem(this.storageKeyPrefix + uid, JSON.stringify(data));
        } catch (e) {
            console.error("Error saving to local storage:", e);
            throw e;
        }
    }
}

export default LocalStorageService;
