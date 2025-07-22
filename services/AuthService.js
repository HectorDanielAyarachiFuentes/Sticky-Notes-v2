// services/AuthService.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { firebaseConfig } from "../config.js";

class AuthService {
    constructor(onAuthChangeCallback) {
        this.app = initializeApp(firebaseConfig);
        this.auth = getAuth(this.app);
        this.provider = new GoogleAuthProvider();
        this.onAuthChangeCallback = onAuthChangeCallback;

        onAuthStateChanged(this.auth, (user) => {
            this.onAuthChangeCallback(user);
        });
    }

    async signIn() {
        try {
            await signInWithPopup(this.auth, this.provider);
        } catch (error) {
            console.error("Error signing in with Google:", error);
        }
    }

    async signOut() {
        try {
            await signOut(this.auth);
        } catch (error) {
            console.error("Error signing out:", error);
        }
    }

    getFirebaseApp() {
        return this.app;
    }
}

export default AuthService;