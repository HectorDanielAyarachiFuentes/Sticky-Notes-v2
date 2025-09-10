// services/FirestoreService.js
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

class FirestoreService {
    constructor(firebaseApp) {
        this.db = getFirestore(firebaseApp);
    }

    async loadUserData(uid) {
        const userDocRef = doc(this.db, 'user_data', uid);
        try {
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                // Data migration logic for old note format
                let loadedNotes = data.notes || [];
                loadedNotes.forEach(note => {
                    if (note.content !== undefined && !note.tabs) {
                        note.tabs = [
                            { name: 'Nota 1', content: note.content },
                            { name: 'Nota 2', content: '' },
                            { name: 'Nota 3', content: '' },
                            { name: 'Nota 4', content: '' },
                            { name: 'Nota 5', content: '' },
                        ];
                        note.activeTabIndex = 0;
                        delete note.content;
                    }
                    if (note.width === undefined) { note.width = 320; }
                    if (note.height === undefined) { note.height = 240; }
                });
                // Devolver todos los datos del usuario. main.js ya maneja los valores por defecto si faltan campos.
                data.notes = loadedNotes;
                return data;
            } else {
                // Si el usuario es nuevo, devolver una estructura de datos vacía y completa.
                return { notes: [], zones: [], youtubeUrl: '', youtubeUrlHistory: [], panX: 0, panY: 0, zoom: 1 };
            }
        } catch (error) {
            console.error("Error loading data:", error);
            throw error;
        }
    }

    async saveUserData(uid, data) {
        const userDocRef = doc(this.db, 'user_data', uid);
        try {
            await setDoc(userDocRef, data);
        } catch (error) {
            console.error("Error saving data:", error);
            throw error;
        }
    }
}

export default FirestoreService;