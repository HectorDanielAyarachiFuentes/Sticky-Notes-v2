// components/Modal.js
import { getElement } from "../utils/dom.js";

class BaseModal {
    constructor(overlayId, titleId, messageId, closeBtnId = null) {
        this.overlay = getElement(`#${overlayId}`);
        // Modificación: Hacemos que title y message sean opcionales si no existen en el HTML del modal
        this.title = getElement(`#${titleId}`, this.overlay);
        this.message = messageId ? getElement(`#${messageId}`, this.overlay) : null; // 'messageId' ahora es opcional
        this.closeBtn = closeBtnId ? getElement(`#${closeBtnId}`, this.overlay) : null;

        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.close());
        }
        this.overlay.addEventListener('click', e => {
            // Asegúrate de que solo se cierre si se hace clic en el overlay directamente, no en el contenido del modal
            if (e.target === this.overlay) this.close();
        });
    }

    // El 'message' en 'open' también será opcional, ya que 'this.message' puede ser null
    open(title, message) {
        if (this.title) this.title.textContent = title;
        if (this.message) this.message.textContent = message; // Se asigna solo si existe
        this.overlay.classList.add('visible');
    }

    close() {
        this.overlay.classList.remove('visible');
    }
}

class ConfirmModal extends BaseModal {
    constructor(overlayId, titleId, messageId, confirmBtnId, cancelBtnId) {
        super(overlayId, titleId, messageId);
        this.confirmBtn = getElement(`#${confirmBtnId}`, this.overlay);
        this.cancelBtn = getElement(`#${cancelBtnId}`, this.overlay);
        this.confirmCallback = null;
        this.cancelCallback = null;

        this.confirmBtn.addEventListener('click', () => {
            if (this.confirmCallback) this.confirmCallback();
            this.close();
        });
        this.cancelBtn.addEventListener('click', () => {
            if (this.cancelCallback) this.cancelCallback();
            this.close();
        });
    }

    open(title, message, confirmAction, cancelAction = null) {
        super.open(title, message);
        this.confirmCallback = confirmAction;
        this.cancelCallback = cancelAction;
    }

    close() {
        super.close();
        this.confirmCallback = null; // Limpiar callbacks para evitar referencias antiguas
        this.cancelCallback = null;
    }
}

// Instancias de los modales para uso global
export const alertModal = new BaseModal('alert-modal-overlay', 'alert-modal-title', 'alert-modal-message', 'alert-modal-close-btn');
export const confirmModal = new ConfirmModal('confirm-modal-overlay', 'confirm-modal-title', 'confirm-modal-message', 'confirm-modal-confirm-btn', 'confirm-modal-cancel-btn');
// NUEVO: Instancia del modal para la lista de notas
export const noteListModal = new BaseModal('note-list-modal-overlay', 'note-list-modal-title', null, 'note-list-modal-close-btn');
