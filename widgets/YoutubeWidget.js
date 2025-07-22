// widgets/YoutubeWidget.js
import { getElement, getElements } from "../utils/dom.js";
import { CONSTANTS } from "../config.js";

class YoutubeWidget {
    constructor(containerSelector, appState, onUrlChangeCallback) {
        this.container = typeof containerSelector === 'string' ? getElement(containerSelector) : containerSelector;
        if (!this.container) return;

        this.appState = appState;
        this.onUrlChangeCallback = onUrlChangeCallback;

        this.input = getElement('#youtube-url-input', this.container);
        this.playerContainer = getElement('#youtube-player-container', this.container);
        this.playPauseBtns = getElements('#yt-play-pause-btn', this.container);
        
        // Encuentra el div del reproductor, que ahora puede tener uno de dos IDs.
        this.playerDiv = getElement('#youtube-player, #youtube-player-mobile', this.container);
        this.player = null; // YT.Player instance

        this.bindEvents();
        this.initializePlayer();
    }

    bindEvents() {
        if (this.input) this.input.addEventListener('change', e => this.loadVideo(e.target.value));
    }

    getVideoId(url) {
        const m = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
        return (m && m[2].length === 11) ? m[2] : null;
    }

    loadVideo(url) {
        const videoId = this.getVideoId(url);
        if (videoId) {
            if (this.player && typeof this.player.loadVideoById === 'function') {
                this.player.loadVideoById(videoId);
            } else {
                // Asegúrate de que YT.Player esté disponible y tengamos un div al que apuntar
                if (typeof YT !== 'undefined' && YT.Player && this.playerDiv) {
                    this.player = new YT.Player(this.playerDiv.id, { // Usa el ID del div encontrado
                        height: '100%',
                        width: '100%',
                        videoId: videoId,
                        playerVars: { 'playsinline': 1, 'controls': 0, 'modestbranding': 1, 'rel': 0 },
                        events: {
                            'onReady': this.onPlayerReady.bind(this),
                            'onStateChange': this.onPlayerStateChange.bind(this)
                        }
                    });
                } else {
                    console.warn("YouTube Iframe API not loaded.");
                }
            }
            if (this.appState.getYoutubeUrl() !== url) {
                this.appState.setYoutubeUrl(url);
                this.onUrlChangeCallback(url); // Notifica a App.js para guardar datos
            }
        }
    }

    initializePlayer() {
        // Esta función se ejecutará para esta instancia una vez que la API esté lista.
        const initFn = () => {
            if (this.appState.getYoutubeUrl() && this.input) {
                this.input.value = this.appState.getYoutubeUrl();
                this.loadVideo(this.appState.getYoutubeUrl());
            }
        };

        // Si la API ya está lista, ejecutar ahora.
        if (typeof YT !== 'undefined' && YT.loaded) {
            initFn();
            return;
        }

        // Si la API no está lista, agregar nuestra función a una cola.
        // Configurar el callback global y la cola si es la primera vez.
        if (!window.ytApiCallbacks) {
            window.ytApiCallbacks = [];
            window.onYouTubeIframeAPIReady = () => {
                window.ytApiCallbacks.forEach(callback => callback());
            };
        }
        window.ytApiCallbacks.push(initFn);
    }


    onPlayerReady(event) {
        this.playPauseBtns.forEach(btn => {
            btn.innerHTML = CONSTANTS.ICONS.PLAY; // Ícono inicial de Play
            btn.onclick = () => {
                const playerState = this.player.getPlayerState();
                if (playerState === YT.PlayerState.PLAYING) {
                    this.player.pauseVideo();
                } else {
                    this.player.playVideo();
                }
            };
        });
    }

    onPlayerStateChange(event) {
        this.playPauseBtns.forEach(btn => {
            if (event.data === YT.PlayerState.PLAYING) {
                btn.innerHTML = CONSTANTS.ICONS.PAUSE;
            } else {
                btn.innerHTML = CONSTANTS.ICONS.PLAY;
            }
        });
        this.playerContainer.classList.toggle('paused', event.data !== YT.PlayerState.PLAYING);
    }
}

export default YoutubeWidget;