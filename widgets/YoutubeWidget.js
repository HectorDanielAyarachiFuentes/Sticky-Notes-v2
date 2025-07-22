// widgets/YoutubeWidget.js
import { getElement, getElements } from "../utils/dom.js";
import { CONSTANTS } from "../config.js";

class YoutubeWidget {
    constructor(containerSelector, appState, onUrlChangeCallback) {
        this.container = getElement(containerSelector);
        if (!this.container) return;

        this.appState = appState;
        this.onUrlChangeCallback = onUrlChangeCallback;

        this.input = getElement('#youtube-url-input', this.container);
        this.playerContainer = getElement('#youtube-player-container', this.container);
        this.playPauseBtns = getElements('#yt-play-pause-btn', this.container);
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
                // Asegúrate de que YT.Player esté disponible
                if (typeof YT !== 'undefined' && YT.Player) {
                    this.player = new YT.Player('youtube-player', {
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
        // Cargar script de la API de YouTube si no está ya cargado
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }

        if (this.appState.getYoutubeUrl() && this.input) {
            this.input.value = this.appState.getYoutubeUrl();
            // Esto se llamará cuando la API esté lista
            window.onYouTubeIframeAPIReady = () => {
                this.loadVideo(this.appState.getYoutubeUrl());
            };
            // Si la API ya estaba lista (por ejemplo, después de una recarga suave)
            if (typeof YT !== 'undefined' && YT.loaded) {
                window.onYouTubeIframeAPIReady();
            }
        } else {
            // Asegúrate de que onYouTubeIframeAPIReady siempre esté definido para evitar errores
            window.onYouTubeIframeAPIReady = () => {};
        }
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