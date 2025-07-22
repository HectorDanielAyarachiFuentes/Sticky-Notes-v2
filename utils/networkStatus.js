// project/utils/networkStatus.js

/**
 * Módulo para monitorear el estado de la conexión a internet
 * y mostrar notificaciones al usuario.
 */

let statusBanner = null; // Referencia al elemento del banner
let hideBannerTimeoutId = null; // NUEVA VARIABLE: Para almacenar el ID del temporizador de ocultamiento

/**
 * Crea e inicializa el elemento del banner de estado de red.
 */
function createStatusBanner() {
    if (statusBanner) return; // Evita crear el banner múltiples veces
    statusBanner = document.createElement('div');
    statusBanner.id = 'network-status-banner';
    statusBanner.style.position = 'fixed';
    statusBanner.style.top = '0';
    statusBanner.style.left = '0';
    statusBanner.style.width = '100%';
    statusBanner.style.padding = '10px 0';
    statusBanner.style.textAlign = 'center';
    statusBanner.style.color = 'white';
    statusBanner.style.fontWeight = 'bold';
    statusBanner.style.zIndex = '10000'; // Asegúrate de que esté encima de todo
    statusBanner.style.transition = 'background-color 0.3s ease, transform 0.3s ease-out';
    statusBanner.style.transform = 'translateY(-100%)'; // Inicialmente oculto
    statusBanner.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    document.body.appendChild(statusBanner);
}

/**
 * Muestra u oculta el banner de estado de red con el mensaje y estilo adecuado.
 * @param {boolean} isOnline - True si está online, false si está offline.
 */
function updateNetworkStatusDisplay(isOnline) {
    if (!statusBanner) {
        createStatusBanner(); // Asegúrate de que el banner exista
    }

    // AÑADIDO: Limpiar cualquier temporizador de ocultamiento existente
    if (hideBannerTimeoutId) {
        clearTimeout(hideBannerTimeoutId);
        hideBannerTimeoutId = null;
    }

    if (isOnline) {
        statusBanner.style.backgroundColor = '#4CAF50'; // Verde
        statusBanner.innerText = '¡Conexión restaurada! Estás online de nuevo.';
        statusBanner.style.transform = 'translateY(0)'; // Mostrar
        // Ocultar después de un breve tiempo
        hideBannerTimeoutId = setTimeout(() => { // Almacenar el ID del temporizador
            statusBanner.style.transform = 'translateY(-100%)';
            hideBannerTimeoutId = null; // Limpiar el ID una vez que se ejecuta
        }, 3000);
    } else {
        statusBanner.style.backgroundColor = '#f44336'; // Rojo
        statusBanner.innerText = '¡Sin conexión! Revisa tu internet.';
        statusBanner.style.transform = 'translateY(0)'; // Mostrar
    }
}

/**
 * Inicializa el monitoreo del estado de la red.
 * Se debe llamar una vez al cargar la aplicación.
 */
export function initNetworkStatusMonitor() {
    createStatusBanner(); // Crea el banner al iniciar

    // Verificar el estado inicial
    updateNetworkStatusDisplay(navigator.onLine);

    // Añadir listeners para los eventos online/offline
    window.addEventListener('online', () => {
        console.log('Navegador detecta conexión: online');
        updateNetworkStatusDisplay(true);
        // Aquí podrías agregar lógica para re-sincronizar datos o reintentar operaciones
    });

    window.addEventListener('offline', () => {
        console.log('Navegador detecta conexión: offline');
        updateNetworkStatusDisplay(false);
        // Aquí podrías agregar lógica para deshabilitar funcionalidades que requieran internet
    });

    console.log('Monitoreo de red inicializado. Estado actual:', navigator.onLine ? 'online' : 'offline');
}