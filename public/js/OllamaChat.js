import { FileManager } from './managers/FileManager.js';
import { MarkdownRenderer } from './utils/MarkdownRenderer.js';
import { SyntaxHighlighter } from './utils/SyntaxHighlighter.js';
import { ChatStorage } from './utils/ChatStorage.js';
import { ThemeManager } from './managers/ThemeManager.js';
import { UIManager } from './managers/UIManager.js';
import { ModalManager } from './managers/ModalManager.js';


export class OllamaChat {
    constructor() {
        this.isGenerating = false;
        this.currentModel = '';
        this.chats = new Map();
        this.currentChatId = null;
        this.chatCounter = 0;
        
        this.fileManager = new FileManager();
        this.markdownRenderer = new MarkdownRenderer();
        this.syntaxHighlighter = new SyntaxHighlighter();
        this.chatStorage = new ChatStorage();
        this.themeManager = new ThemeManager();
        this.uiManager = new UIManager();
        this.modal = new ModalManager();
        
        setTimeout(() => this.initialize(), 1000);
    }

    initialize() {
        this.attachEventListeners();
        this.themeManager.load();
        this.loadChatHistory();
        this.checkStatus();
        this.loadModels();
        
        setInterval(() => this.checkStatus(), 30000);
    }

    attachEventListeners() {
        const { elements } = this.uiManager;
        
        elements.sidebarToggle?.addEventListener('click', () => this.uiManager.toggleSidebar());
        elements.sidebarToggleMobile?.addEventListener('click', () => this.uiManager.toggleSidebar());
        elements.sidebarReopener?.addEventListener('click', () => this.uiManager.openSidebar());
        elements.newChatBtn?.addEventListener('click', () => this.createNewChat());
        elements.clearAllBtn?.addEventListener('click', () => this.clearAllChats());
        elements.themeToggle?.addEventListener('click', () => this.themeManager.toggle());
        elements.clearBtn?.addEventListener('click', () => this.clearCurrentChat());
        elements.sendBtn?.addEventListener('click', () => this.sendMessage());
        elements.promptInput?.addEventListener('keydown', (e) => this.handleKeyDown(e));
        elements.promptInput?.addEventListener('input', (e) => this.uiManager.autoResize(e.target));
        elements.modelSelect?.addEventListener('change', (e) => {
            this.currentModel = e.target.value;
        });
        elements.fileBtn?.addEventListener('click', () => elements.fileInput?.click());
        elements.fileInput?.addEventListener('change', (e) => this.handleFileSelection(e));
        elements.importBtn?.addEventListener('click', () => elements.importInput?.click());
        elements.importInput?.addEventListener('change', (e) => this.handleImportChats(e));
        
        document.addEventListener('click', (event) => {
            if (!event.target.closest('.chat-actions') && !event.target.closest('.chat-menu')) {
                document.querySelectorAll('.chat-menu').forEach(menu => {
                    menu.style.display = 'none';
                });
            }
        });
    }

    async handleFileSelection(event) {
        const files = Array.from(event.target.files);
        
        try {
            await this.fileManager.handleFileSelection(files);
            this.updateFilePreview();
        } catch (error) {
            alert(`File error: ${error.message}`);
        }
        
        event.target.value = '';
    }

    updateFilePreview() {
        this.uiManager.updateFilePreview(this.fileManager.selectedFiles, {
            clearAll: 'app.clearFiles()',
            removeFile: 'app.removeFile'
        });
    }

    removeFile(index) {
        this.fileManager.removeFile(index);
        this.updateFilePreview();
    }

    clearFiles() {
        this.fileManager.clearFiles();
        this.updateFilePreview();
    }

    addMessageToDOM(content, sender, doScrollToBottom = true, files = []) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        if (sender === 'assistant') {
            contentDiv.innerHTML = this.markdownRenderer.render(content);
            setTimeout(() => {
                this.syntaxHighlighter.applyHighlighting(contentDiv);
                this.addCopyButtons(contentDiv);
            }, 200);
        } else {
            contentDiv.textContent = content;
        }
        
        messageDiv.appendChild(contentDiv);
        
        if (files && files.length > 0) {
            const filesDiv = document.createElement('div');
            filesDiv.className = 'message-files';
            files.forEach(file => {
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';
                fileItem.innerHTML = `
                    <span class="file-icon">📄</span>
                    <div class="file-info">
                        <div class="file-name">${this.uiManager.escapeHtml(file.originalName)}</div>
                        <div class="file-size">${this.uiManager.formatFileSize(file.fileSize)}</div>
                    </div>
                `;
                filesDiv.appendChild(fileItem);
            });
            messageDiv.appendChild(filesDiv);
        }
        
        this.uiManager.elements.messages.appendChild(messageDiv);
        
        if (doScrollToBottom) {
            this.uiManager.scrollToBottom();
        }
        
        return contentDiv;
    }

    updateMessageContent(messageElement, content) {
        messageElement.innerHTML = this.markdownRenderer.render(content);
        setTimeout(() => {
            this.syntaxHighlighter.applyHighlighting(messageElement);
            this.addCopyButtons(messageElement);
        }, 100);
    }

    addCopyButtons(element) {
        const codeBlocks = element.querySelectorAll('pre');
        
        codeBlocks.forEach(block => {
            if (block.querySelector('.copy-btn')) return;
            
            const code = block.querySelector('code');
            if (!code) return;
            
            const btn = document.createElement('button');
            btn.className = 'copy-btn';
            btn.textContent = 'Copy';
            btn.style.cssText = `
                position: absolute; top: 0.5rem; right: 0.5rem;
                background: var(--bg-tertiary); border: 1px solid var(--border);
                border-radius: 4px; padding: 0.25rem 0.5rem;
                font-size: 0.75rem; cursor: pointer; z-index: 10;
            `;
            
            btn.onclick = async () => {
                try {
                    await navigator.clipboard.writeText(code.textContent);
                    btn.textContent = '✓ Copied!';
                    setTimeout(() => {
                        btn.textContent = 'Copy';
                    }, 2000);
                } catch (err) {
                    // Silent fail
                }
            };
            
            block.style.position = 'relative';
            block.appendChild(btn);
        });
    }

    async sendMessage() {
        const prompt = this.uiManager.elements.promptInput.value.trim();
        if (!prompt || !this.currentModel || this.isGenerating) return;
        
        if (!this.currentChatId) {
            await this.createNewChat();
        }
        
        const chat = this.chats.get(this.currentChatId);
        if (!chat) return;
        
        this.setGeneratingState(true);
        
        let fullPrompt = prompt;
        const attachedFiles = [...this.fileManager.selectedFiles];
        
        if (attachedFiles.length > 0) {
            fullPrompt += '\n\nProvided files:\n';
            attachedFiles.forEach(file => {
                fullPrompt += `\n--- ${file.originalName} ---\n${file.content}\n--- End ---\n`;
            });
        }
        
        const userMessage = { 
            sender: 'user', 
            content: prompt, 
            timestamp: new Date(),
            files: attachedFiles
        };
        
        chat.messages.push(userMessage);
        chat.updatedAt = new Date();
        
        this.addMessageToDOM(prompt, 'user', true, userMessage.files);
        this.saveChatHistory();
        this.clearInputs();
        
        try {
            await this.handleStreamingResponse(fullPrompt);
        } catch (error) {
            const errorMessage = { sender: 'assistant', content: 'Error generating response', timestamp: new Date() };
            chat.messages.push(errorMessage);
            this.addMessageToDOM('Error generating response', 'assistant');
            this.saveChatHistory();
        } finally {
            this.setGeneratingState(false);
        }
    }

    setGeneratingState(isGenerating) {
        this.isGenerating = isGenerating;
        this.uiManager.elements.sendBtn.disabled = isGenerating;
        this.uiManager.elements.loading.style.display = isGenerating ? 'block' : 'none';
    }

    clearInputs() {
        this.uiManager.elements.promptInput.value = '';
        this.uiManager.elements.promptInput.style.height = 'auto';
        this.fileManager.clearFiles();
        this.updateFilePreview();
    }

    async handleStreamingResponse(prompt) {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: this.currentModel,
                prompt: prompt,
                stream: true
            })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        const assistantMessage = this.addMessageToDOM('', 'assistant');
        let fullResponse = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            fullResponse += chunk;
            this.updateMessageContent(assistantMessage, fullResponse);
            this.uiManager.scrollToBottom();
        }
        
        const chat = this.chats.get(this.currentChatId);
        const assistantMsg = { sender: 'assistant', content: fullResponse, timestamp: new Date() };
        chat.messages.push(assistantMsg);
        chat.updatedAt = new Date();
        
        if (chat.messages.length === 2 && chat.title === 'New chat') {
            chat.title = this.generateChatTitle(chat.messages[0].content);
        }
        
        this.saveChatHistory();
        this.renderChatHistory();
    }

    generateChatTitle(firstMessage) {
        const words = firstMessage.trim().split(' ').slice(0, 5);
        return words.join(' ') + (firstMessage.split(' ').length > 5 ? '...' : '');
    }

    async createNewChat() {
        const chatId = `chat_${Date.now()}_${++this.chatCounter}`;
        const chat = {
            id: chatId,
            title: 'New chat',
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        this.chats.set(chatId, chat);
        this.currentChatId = chatId;
        this.renderChatHistory();
        this.clearMessagesDisplay();
        this.uiManager.showEmptyState();
    }

    renderCurrentChat() {
        if (!this.currentChatId || !this.chats.has(this.currentChatId)) {
            this.uiManager.showEmptyState();
            return;
        }
        
        const chat = this.chats.get(this.currentChatId);
        this.clearMessagesDisplay();
        
        if (chat.messages.length === 0) {
            this.uiManager.showEmptyState();
        } else {
            chat.messages.forEach((message) => {
                this.addMessageToDOM(message.content, message.sender, false, message.files || []);
            });
            setTimeout(() => this.uiManager.scrollToBottom(), 100);
        }
    }

    clearMessagesDisplay() {
        if (this.uiManager.elements.messages) {
            this.uiManager.elements.messages.innerHTML = '';
        }
    }

    loadChatHistory() {
        const { chats, currentChatId } = this.chatStorage.load();
        
        this.chats = chats;
        
        if (currentChatId && this.chats.has(currentChatId)) {
            this.currentChatId = currentChatId;
        } else {
            const firstChatId = Array.from(this.chats.keys())[0];
            if (firstChatId) {
                this.currentChatId = firstChatId;
            }
        }
        
        if (this.chats.size === 0) {
            this.createNewChat();
        } else {
            this.renderChatHistory();
            this.renderCurrentChat();
        }
    }

    saveChatHistory() {
        this.chatStorage.save(this.chats, this.currentChatId);
    }

    renderChatHistory() {
        if (!this.uiManager.elements.chatHistory) return;
        
        const chatItems = Array.from(this.chats.entries())
            .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
            .map(([chatId, chat]) => {
                const isActive = chatId === this.currentChatId;
                const messageCount = chat.messages.length;
                const lastUpdate = chat.updatedAt.toLocaleDateString();
                
                return `
                    <div class="chat-item ${isActive ? 'active' : ''}" data-chat-id="${chatId}">
                        <div class="chat-main" onclick="app.switchToChat('${chatId}')">
                            <div class="chat-title">${this.uiManager.escapeHtml(chat.title)}</div>
                            <div class="chat-meta">
                                <span class="message-count">${messageCount} messages</span>
                                <span class="last-update">${lastUpdate}</span>
                            </div>
                        </div>
                        
                        <div class="chat-actions">
                            <button class="chat-action-btn" onclick="app.showChatMenu('${chatId}')" title="Actions">⋯</button>
                        </div>
                        
                        <div class="chat-menu" id="menu-${chatId}" style="display: none;">
                            <button onclick="app.renameChat('${chatId}', prompt('New name:', '${this.uiManager.escapeHtml(chat.title)}'))" class="menu-item">
                                ✏️ Rename
                            </button>
                            <button onclick="app.duplicateChat('${chatId}')" class="menu-item">
                                📋 Duplicate
                            </button>
                            <button onclick="app.exportChat('${chatId}')" class="menu-item">
                                📤 Export
                            </button>
                            <hr class="menu-divider">
                            <button onclick="app.deleteChat('${chatId}')" class="menu-item danger">
                                🗑️ Delete
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        
        this.uiManager.elements.chatHistory.innerHTML = chatItems;
    }

    showChatMenu(chatId) {
        document.querySelectorAll('.chat-menu').forEach(menu => {
            if (menu.id !== `menu-${chatId}`) {
                menu.style.display = 'none';
            }
        });
        
        const menu = document.getElementById(`menu-${chatId}`);
        if (menu) {
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        }
    }

    switchToChat(chatId) {
        if (!this.chats.has(chatId)) return;
        
        this.currentChatId = chatId;
        this.renderChatHistory();
        this.renderCurrentChat();
        this.saveChatHistory();
    }

    handleKeyDown(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
        }
    }

    async checkStatus() {
        try {
            const response = await fetch('/api/status');
            const data = await response.json();
            this.uiManager.updateStatus(data.status === 'connected' ? 'connected' : 'disconnected');
        } catch {
            this.uiManager.updateStatus('error');
        }
    }

    async loadModels() {
        try {
            const response = await fetch('/api/models');
            const data = await response.json();
            
            if (this.uiManager.elements.modelSelect) {
                this.uiManager.elements.modelSelect.innerHTML = '';
                
                if (data.models?.length > 0) {
                    data.models.forEach(model => {
                        const option = document.createElement('option');
                        option.value = model.name;
                        option.textContent = model.name;
                        this.uiManager.elements.modelSelect.appendChild(option);
                    });
                    
                    this.currentModel = data.models[0].name;
                    this.uiManager.elements.modelSelect.value = this.currentModel;
                } else {
                    this.uiManager.elements.modelSelect.innerHTML = '<option value="">No models</option>';
                }
            }
        } catch {
            if (this.uiManager.elements.modelSelect) {
                this.uiManager.elements.modelSelect.innerHTML = '<option value="">Error</option>';
            }
        }
    }

    clearCurrentChat() {
        if (!this.currentChatId || !this.chats.has(this.currentChatId)) return;
        
        if (confirm('Clear all messages in this chat?')) {
            const chat = this.chats.get(this.currentChatId);
            chat.messages = [];
            chat.title = 'New chat';
            chat.updatedAt = new Date();
            
            this.renderCurrentChat();
            this.saveChatHistory();
            this.renderChatHistory();
        }
    }

    async clearAllChats() {
        const confirmed = await this.modal.danger(
            'Delete All Chats',
            'Are you sure you want to delete all chats? This action cannot be undone and will permanently remove all your conversation history.',
            {
                confirmText: 'Delete All',
                cancelText: 'Cancel'
            }
        );

        if (confirmed) {
            this.chats.clear();
            this.currentChatId = null;
            this.renderChatHistory();
            this.clearMessages();
            this.saveChatHistory();

            await this.modal.alert(
                'All Chats Deleted',
                'All chats have been successfully deleted.',
                { type: 'success' }
            );
        }
    }

    async deleteChat(chatId) {
        const confirmed = await this.modal.danger(
            'Delete Chat',
            'Are you sure you want to delete this chat? This action cannot be undone.',
            {
                confirmText: 'Delete',
                cancelText: 'Cancel'
            }
        );

        if (confirmed) {
            this.chats.delete(chatId);
            this.renderChatHistory();
            this.saveChatHistory();
            
            if (this.currentChatId === chatId) {
                this.currentChatId = null;
                this.clearMessages();
            }

            await this.modal.alert(
                'Chat Deleted',
                'The chat has been successfully deleted.',
                { type: 'success' }
            );
        }
    }

    async renameChat(chatId, newTitle) {
        if (!newTitle) {
            newTitle = await this.modal.prompt(
                'Rename Chat',
                'Enter a new name for this chat:',
                {
                    placeholder: 'Chat name...',
                    defaultValue: this.chats.get(chatId)?.title || '',
                    confirmText: 'Rename',
                    cancelText: 'Cancel'
                }
            );
        }

        if (newTitle && newTitle.trim()) {
            const chat = this.chats.get(chatId);
            if (chat) {
                chat.title = newTitle.trim();
                chat.updatedAt = new Date();
                this.renderChatHistory();
                this.saveChatHistory();
            }
        }
    }

    async exportChat(chatId) {
        if (!this.chats.has(chatId)) return;
        
        const chat = this.chats.get(chatId);
        
        let exportContent = `# ${chat.title}\n\n`;
        exportContent += `**Created:** ${chat.createdAt.toLocaleString()}\n`;
        exportContent += `**Last modified:** ${chat.updatedAt.toLocaleString()}\n`;
        exportContent += `**Messages:** ${chat.messages.length}\n\n`;
        exportContent += `---\n\n`;
        
        chat.messages.forEach((message) => {
            const sender = message.sender === 'user' ? '👤 User' : '🤖 Assistant';
            const timestamp = message.timestamp ? new Date(message.timestamp).toLocaleString() : 'Unknown date';
            
            exportContent += `## ${sender} - ${timestamp}\n\n`;
            exportContent += `${message.content}\n\n`;
            
            if (message.files && message.files.length > 0) {
                exportContent += `**Attached files:**\n`;
                message.files.forEach(file => {
                    exportContent += `- ${file.originalName} (${this.uiManager.formatFileSize(file.fileSize)})\n`;
                });
                exportContent += `\n`;
            }
            
            exportContent += `---\n\n`;
        });
        
        const blob = new Blob([exportContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-${chat.title.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async handleImportChats(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await this.readFileAsText(file);
            const importedData = JSON.parse(text);
            
            if (this.validateImportData(importedData)) {
                await this.importChats(importedData);
                await this.modal.alert(
                    'Import Successful',
                    `Successfully imported ${importedData.chats.length} chat(s).`,
                    { type: 'success' }
                );
            } else {
                await this.modal.alert(
                    'Import Failed',
                    'Invalid file format. Please select a valid chat export file.',
                    { type: 'danger' }
                );
            }
        } catch (error) {
            console.error('Import error:', error);
            await this.modal.alert(
                'Import Error',
                `Failed to import chats: ${error.message}`,
                { type: 'danger' }
            );
        }
        
        event.target.value = '';
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    validateImportData(data) {
        return data && 
               typeof data === 'object' && 
               Array.isArray(data.chats) &&
               data.chats.every(chat => 
                   chat.id && 
                   chat.title && 
                   Array.isArray(chat.messages)
               );
    }

    async importChats(importedData) {
        // Merge with existing chats
        importedData.chats.forEach(importedChat => {
            // Generate new ID if conflict
            let chatId = importedChat.id;
            let counter = 1;
            while (this.chats.has(chatId)) {
                chatId = `${importedChat.id}_imported_${counter}`;
                counter++;
            }
            
            const chat = {
                id: chatId,
                title: importedChat.title + (counter > 1 ? ` (imported ${counter-1})` : ''),
                messages: importedChat.messages.map(msg => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp || Date.now())
                })),
                createdAt: new Date(importedChat.createdAt || Date.now()),
                updatedAt: new Date(importedChat.updatedAt || Date.now())
            };
            
            this.chats.set(chatId, chat);
        });
        
        this.renderChatHistory();
        this.saveChatHistory();
    }
}