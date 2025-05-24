export class ModalManager {
    constructor() {
        this.createModalContainer();
    }

    createModalContainer() {
        if (!document.getElementById('modal-container')) {
            const container = document.createElement('div');
            container.id = 'modal-container';
            document.body.appendChild(container);
        }
    }

    show(options) {
        return new Promise((resolve) => {
            const {
                title,
                subtitle,
                content,
                type = 'info',
                primaryButton = 'OK',
                secondaryButton = null,
                input = null
            } = options;

            const modalHTML = `
                <div class="modal-overlay" id="current-modal">
                    <div class="modal">
                        <div class="modal-header">
                            ${type !== 'info' ? `<div class="modal-icon ${type}">${this.getIcon(type)}</div>` : ''}
                            <div class="modal-title">${title}</div>
                            ${subtitle ? `<div class="modal-subtitle">${subtitle}</div>` : ''}
                        </div>
                        
                        ${content ? `
                            <div class="modal-body">
                                <div class="modal-content">${content}</div>
                                ${input ? `<input type="text" class="modal-input" placeholder="${input.placeholder || ''}" value="${input.value || ''}" id="modal-input">` : ''}
                            </div>
                        ` : ''}
                        
                        <div class="modal-actions">
                            ${secondaryButton ? `<button class="modal-btn modal-btn-secondary" id="modal-secondary">${secondaryButton}</button>` : ''}
                            <button class="modal-btn modal-btn-${type === 'danger' ? 'danger' : 'primary'}" id="modal-primary">${primaryButton}</button>
                        </div>
                    </div>
                </div>
            `;

            const container = document.getElementById('modal-container');
            container.innerHTML = modalHTML;

            const overlay = document.getElementById('current-modal');
            const primaryBtn = document.getElementById('modal-primary');
            const secondaryBtn = document.getElementById('modal-secondary');
            const inputField = document.getElementById('modal-input');

            setTimeout(() => overlay.classList.add('show'), 10);

            if (inputField) {
                setTimeout(() => inputField.focus(), 100);
            }

            const handlePrimary = () => {
                const result = input ? inputField?.value || '' : true;
                this.close();
                resolve(result);
            };

            const handleSecondary = () => {
                this.close();
                resolve(false);
            };

            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    this.close();
                    resolve(false);
                    document.removeEventListener('keydown', handleEscape);
                }
            };

            const handleEnter = (e) => {
                if (e.key === 'Enter') {
                    handlePrimary();
                    document.removeEventListener('keydown', handleEnter);
                }
            };

            primaryBtn.addEventListener('click', handlePrimary);
            if (secondaryBtn) {
                secondaryBtn.addEventListener('click', handleSecondary);
            }
            
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    handleSecondary();
                }
            });

            document.addEventListener('keydown', handleEscape);
            if (input || !secondaryButton) {
                document.addEventListener('keydown', handleEnter);
            }
        });
    }

    close() {
        const overlay = document.getElementById('current-modal');
        if (overlay) {
            overlay.classList.remove('show');
            setTimeout(() => {
                const container = document.getElementById('modal-container');
                if (container) {
                    container.innerHTML = '';
                }
            }, 300);
        }
    }

    getIcon(type) {
        const icons = {
            danger: '⚠️',
            warning: '⚠️',
            success: '✅',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    confirm(title, content, options = {}) {
        return this.show({
            title,
            content,
            type: 'warning',
            primaryButton: options.confirmText || 'Confirm',
            secondaryButton: options.cancelText || 'Cancel',
            ...options
        });
    }

    alert(title, content, options = {}) {
        return this.show({
            title,
            content,
            type: options.type || 'info',
            primaryButton: 'OK',
            ...options
        });
    }

    prompt(title, content, options = {}) {
        return this.show({
            title,
            content,
            type: 'info',
            primaryButton: options.confirmText || 'OK',
            secondaryButton: options.cancelText || 'Cancel',
            input: {
                placeholder: options.placeholder || '',
                value: options.defaultValue || ''
            },
            ...options
        });
    }

    danger(title, content, options = {}) {
        return this.show({
            title,
            content,
            type: 'danger',
            primaryButton: options.confirmText || 'Delete',
            secondaryButton: options.cancelText || 'Cancel',
            ...options
        });
    }
}