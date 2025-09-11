// services/AuthService.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { firebaseConfig, USE_FIREBASE } from "../config.js";

class AuthService {
    constructor(onAuthChangeCallback) {
        this.onAuthChangeCallback = onAuthChangeCallback;
        this.localSessionKey = 'localUserSessionActive';

        if (USE_FIREBASE) {
            this.app = initializeApp(firebaseConfig);
            this.auth = getAuth(this.app);
            this.provider = new GoogleAuthProvider();
            onAuthStateChanged(this.auth, (user) => {
                this.onAuthChangeCallback(user);
            });
        } else {
            // En modo local, comprueba si hay una sesión activa en localStorage.
            console.log("Modo local activado. Comprobando sesión...");
            setTimeout(() => {
                if (localStorage.getItem(this.localSessionKey) === 'true') {
                    console.log("Sesión local encontrada. Iniciando sesión...");
                    const mockUser = {
                        uid: 'localUser',
                        displayName: 'Usuario Local',
                        photoURL: `https://ui-avatars.com/api/?name=Local+User&background=random&color=fff`
                    };
                    this.onAuthChangeCallback(mockUser);
                } else {
                    console.log("No hay sesión local. Mostrando pantalla de login.");
                    this.onAuthChangeCallback(null);
                }
            }, 100); // Pequeño delay para simular asincronía
        }
    }

    async signIn() {
        if (!USE_FIREBASE) {
            console.log("Iniciando sesión en modo local.");
            const mockUser = {
                uid: 'localUser',
                displayName: 'Usuario Local',
                photoURL: `https://ui-avatars.com/api/?name=Local+User&background=random&color=fff`
            };
            localStorage.setItem(this.localSessionKey, 'true');
            this.onAuthChangeCallback(mockUser);
            return; // Salir para no ejecutar el código de Firebase
        }
        try {
            await signInWithPopup(this.auth, this.provider);
        } catch (error) {
            console.error("Error signing in with Google:", error);
        }
    }

    async signOut() {
        if (!USE_FIREBASE) {
            console.log("Cerrando sesión local.");
            // NO debemos borrar los datos del usuario al cerrar sesión.
            // Solo borramos la clave de sesión para que la próxima vez
            // que cargue la página, no inicie sesión automáticamente.
            // localStorage.removeItem('localUserData'); // <-- ESTA LÍNEA ES EL ERROR
            localStorage.removeItem(this.localSessionKey);
            this.onAuthChangeCallback(null);
            return; // Salir para no ejecutar el código de Firebase
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