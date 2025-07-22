// components/TimerModal.js
import { getElement } from "../utils/dom.js";

class TimerModal {
    constructor(overlayId, hoursInputId, minutesInputId, secondsInputId, saveBtnId) {
        this.overlay = getElement(`#${overlayId}`);
        this.hoursInput = getElement(`#${hoursInputId}`, this.overlay);
        this.minutesInput = getElement(`#${minutesInputId}`, this.overlay);
        this.secondsInput = getElement(`#${secondsInputId}`, this.overlay);
        this.saveBtn = getElement(`#${saveBtnId}`, this.overlay);
        this.saveCallback = null;

        this.overlay.addEventListener('click', e => {
            if (e.target === this.overlay) this.close();
        });
        this.saveBtn.addEventListener('click', () => this.handleSave());
    }

    open(currentDurationSeconds, onSave) {
        const h = Math.floor(currentDurationSeconds / 3600);
        const m = Math.floor((currentDurationSeconds % 3600) / 60);
        const s = currentDurationSeconds % 60;

        this.hoursInput.value = h > 0 ? h : '';
        this.minutesInput.value = m > 0 ? m : '';
        this.secondsInput.value = s > 0 ? s : '';

        this.saveCallback = onSave;
        this.overlay.classList.add('visible');
    }

    handleSave() {
        const h = parseInt(this.hoursInput.value) || 0;
        const m = parseInt(this.minutesInput.value) || 0;
        const s = parseInt(this.secondsInput.value) || 0;

        if (this.saveCallback) {
            this.saveCallback(h, m, s);
        }
        this.close();
    }

    close() {
        this.overlay.classList.remove('visible');
        this.saveCallback = null;
    }
}

export default TimerModal;