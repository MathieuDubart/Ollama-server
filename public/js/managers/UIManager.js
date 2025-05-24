export class UIManager {
    constructor() {
        this.elements = this.initializeElements();
    }

    initializeElements() {
        return {
            sidebarToggle: document.getElementById('sidebarToggle'),
            sidebarToggleMobile: document.getElementById('sidebarToggleMobile'),
            sidebarReopener: document.getElementById('sidebarReopener'),
            newChatBtn: document.getElementById('newChatBtn'),
            clearAllBtn: document.getElementById('clearAllBtn'),
            importBtn: document.getElementById('importBtn'),
            importInput: document.getElementById('importInput'),
            themeToggle: document.getElementById('themeToggle'),
            clearBtn: document.getElementById('clearBtn'),
            sendBtn: document.getElementById('sendBtn'),
            promptInput: document.getElementById('promptInput'),
            modelSelect: document.getElementById('modelSelect'),
            fileBtn: document.getElementById('fileBtn'),
            fileInput: document.getElementById('fileInput'),
            messages: document.getElementById('messages'),
            loading: document.getElementById('loading'),
            chatHistory: document.getElementById('chatHistory'),
            filePreview: document.getElementById('filePreview'),
            statusDot: document.getElementById('statusDot'),
            statusText: document.getElementById('statusText'),
            sidebar: document.getElementById('sidebar')
        };
    }

    toggleSidebar() {
        this.elements.sidebar?.classList.toggle('collapsed');
        this.updateSidebarReopener();
    }

    openSidebar() {
        this.elements.sidebar?.classList.remove('collapsed');
        this.updateSidebarReopener();
    }

    updateSidebarReopener() {
        const isCollapsed = this.elements.sidebar?.classList.contains('collapsed');
        if (this.elements.sidebarReopener) {
            this.elements.sidebarReopener.style.display = isCollapsed ? 'flex' : 'none';
        }
    }

    showEmptyState() {
        this.elements.messages.innerHTML = `
            <div class="empty-state">
                <h2>Ready to chat</h2>
                <p>Select a model and start conversation</p>
            </div>
        `;
    }

    scrollToBottom() {
        this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
    }

    autoResize(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    updateStatus(status) {
        if (status === 'connected') {
            this.elements.statusDot?.classList.add('connected');
            if (this.elements.statusText) {
                this.elements.statusText.textContent = 'Connected';
            }
        } else {
            this.elements.statusDot?.classList.remove('connected');
            if (this.elements.statusText) {
                this.elements.statusText.textContent = status === 'error' ? 'Error' : 'Disconnected';
            }
        }
    }

    updateFilePreview(files, callbacks) {
        if (!this.elements.filePreview) return;
        
        if (files.length === 0) {
            this.elements.filePreview.style.display = 'none';
            return;
        }
        
        this.elements.filePreview.style.display = 'block';
        this.elements.filePreview.innerHTML = `
            <div class="file-preview-header">
                <span>📎 ${files.length} file(s)</span>
                <button class="clear-files-btn" onclick="${callbacks.clearAll}">✕</button>
            </div>
            <div class="file-list">
                ${files.map((file, index) => `
                    <div class="file-preview-item">
                        <span class="file-icon">📄</span>
                        <span class="file-name">${this.escapeHtml(file.originalName)}</span>
                        <span class="file-size">${this.formatFileSize(file.fileSize)}</span>
                        <button class="remove-file-btn" onclick="${callbacks.removeFile}(${index})">✕</button>
                    </div>
                `).join('')}
            </div>
        `;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}