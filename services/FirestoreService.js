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
                return { notes: loadedNotes, zones: data.zones || [], youtubeUrl: data.youtubeUrl || '' };
            } else {
                return { notes: [], zones: [], youtubeUrl: '' };
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