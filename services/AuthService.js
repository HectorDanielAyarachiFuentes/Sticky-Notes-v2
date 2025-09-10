// services/AuthService.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { firebaseConfig, USE_FIREBASE } from "../config.js";

class AuthService {
    constructor(onAuthChangeCallback) {
        this.onAuthChangeCallback = onAuthChangeCallback;

        if (USE_FIREBASE) {
            this.app = initializeApp(firebaseConfig);
            this.auth = getAuth(this.app);
            this.provider = new GoogleAuthProvider();
            onAuthStateChanged(this.auth, (user) => {
                this.onAuthChangeCallback(user);
            });
        } else {
            // Simula un inicio de sesión automático en modo local
            console.log("Modo local activado. Simulando inicio de sesión.");
            setTimeout(() => {
                const mockUser = {
                    uid: 'localUser',
                    displayName: 'Usuario Local',
                    photoURL: `https://ui-avatars.com/api/?name=Local+User&background=random&color=fff`
                };
                this.onAuthChangeCallback(mockUser);
            }, 100); // Pequeño delay para simular asincronía
        }
    }

    async signIn() {
        if (!USE_FIREBASE) {
            console.log("El inicio de sesión de Google está deshabilitado en modo local.");
            return;
        }
        try {
            await signInWithPopup(this.auth, this.provider);
        } catch (error) {
            console.error("Error signing in with Google:", error);
        }
    }

    async signOut() {
        if (!USE_FIREBASE) {
            // En modo local, "cerrar sesión" limpia el almacenamiento y recarga la página.
            console.log("Cerrando sesión local. Limpiando datos locales.");
            localStorage.removeItem('localUserData');
            window.location.reload();
            return;
        }
        try {
            await signOut(this.auth);
        } catch (error) {
            console.error("Error signing out:", error);
        }
    }

    getFirebaseApp() {
        if (!USE_FIREBASE) return null;
        return this.app;
    }
}

export default AuthService;