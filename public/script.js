class OllamaChat {
    constructor() {
        this.isGenerating = false;
        this.currentModel = '';
        this.currentTheme = 'dark-theme';
        this.chats = new Map();
        this.currentChatId = null;
        this.chatCounter = 0;
        this.contextSize = 5; // Nombre de messages précédents à inclure
        
        this.initializeMarkdown();
        this.initializeElements();
        this.attachEventListeners();
        this.loadTheme();
        this.loadChatHistory();
        this.initialize();
    }

    initializeMarkdown() {
        // Configuration de marked pour une meilleure sécurité et performance
        if (typeof marked !== 'undefined') {
            marked.setOptions({
                highlight: function(code, lang) {
                    if (typeof Prism !== 'undefined' && lang && Prism.languages[lang]) {
                        try {
                            return Prism.highlight(code, Prism.languages[lang], lang);
                        } catch (e) {
                            return code;
                        }
                    }
                    return code;
                },
                breaks: true,
                gfm: true
            });
        }
    }

    initializeElements() {
        this.elements = {
            // Sidebar elements
            sidebar: document.getElementById('sidebar'),
            sidebarToggle: document.getElementById('sidebarToggle'),
            sidebarToggleMobile: document.getElementById('sidebarToggleMobile'),
            sidebarReopener: document.getElementById('sidebarReopener'),
            newChatBtn: document.getElementById('newChatBtn'),
            chatHistory: document.getElementById('chatHistory'),
            clearAllBtn: document.getElementById('clearAllBtn'),
            
            // Main elements
            themeToggle: document.getElementById('themeToggle'),
            statusDot: document.getElementById('statusDot'),
            statusText: document.getElementById('statusText'),
            modelSelect: document.getElementById('modelSelect'),
            clearBtn: document.getElementById('clearBtn'),
            messages: document.getElementById('messages'),
            loading: document.getElementById('loading'),
            promptInput: document.getElementById('promptInput'),
            sendBtn: document.getElementById('sendBtn'),
            emptyState: document.querySelector('.empty-state')
        };
    }

    attachEventListeners() {
        // Sidebar controls
        this.elements.sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        this.elements.sidebarToggleMobile.addEventListener('click', () => this.toggleSidebar());
        this.elements.sidebarReopener.addEventListener('click', () => this.openSidebar());
        this.elements.newChatBtn.addEventListener('click', () => this.createNewChat());
        this.elements.clearAllBtn.addEventListener('click', () => this.clearAllChats());
        
        // Theme toggle
        this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        // Clear current chat
        this.elements.clearBtn.addEventListener('click', () => this.clearCurrentChat());
        
        // Send message
        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        
        // Input handling
        this.elements.promptInput.addEventListener('keydown', (e) => this.handleKeyDown(e));
        this.elements.promptInput.addEventListener('input', (e) => this.autoResize(e.target));
        
        // Model selection
        this.elements.modelSelect.addEventListener('change', (e) => {
            this.currentModel = e.target.value;
        });
    }

    toggleSidebar() {
        this.elements.sidebar.classList.toggle('collapsed');
        this.updateSidebarReopener();
        localStorage.setItem('sidebar-collapsed', this.elements.sidebar.classList.contains('collapsed'));
    }

    openSidebar() {
        this.elements.sidebar.classList.remove('collapsed');
        this.updateSidebarReopener();
        localStorage.setItem('sidebar-collapsed', false);
    }

    updateSidebarReopener() {
        const isCollapsed = this.elements.sidebar.classList.contains('collapsed');
        if (isCollapsed) {
            this.elements.sidebarReopener.classList.add('visible');
        } else {
            this.elements.sidebarReopener.classList.remove('visible');
        }
    }

    loadSidebarState() {
        const isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
        if (isCollapsed) {
            this.elements.sidebar.classList.add('collapsed');
        }
        this.updateSidebarReopener();
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
        this.renderCurrentChat();
        
        // Sauvegarder en base de données
        await this.saveChatToDatabase(chat);
    }

    loadChat(chatId) {
        if (this.chats.has(chatId)) {
            this.currentChatId = chatId;
            this.renderChatHistory();
            this.renderCurrentChat();
        }
    }

    async deleteChat(chatId) {
        if (confirm('Are you sure you want to delete this chat?')) {
            try {
                // Supprimer de la base de données
                await fetch(`/api/chats/${chatId}`, { method: 'DELETE' });
                
                this.chats.delete(chatId);
                
                if (this.currentChatId === chatId) {
                    const remainingChats = Array.from(this.chats.values())
                        .sort((a, b) => b.updatedAt - a.updatedAt);
                    
                    if (remainingChats.length > 0) {
                        this.currentChatId = remainingChats[0].id;
                    } else {
                        await this.createNewChat();
                        return;
                    }
                }
                
                this.renderChatHistory();
                this.renderCurrentChat();
            } catch (error) {
                console.error('Error while deleting chats : ', error);
            }
        }
    }

    async clearCurrentChat() {
        if (this.currentChatId && this.chats.has(this.currentChatId)) {
            try {
                // Vider les messages en base de données
                await fetch(`/api/chats/${this.currentChatId}/messages`, { method: 'DELETE' });
                
                const chat = this.chats.get(this.currentChatId);
                chat.messages = [];
                chat.title = 'New chat';
                chat.updatedAt = new Date();
                
                this.renderChatHistory();
                this.renderCurrentChat();
            } catch (error) {
                console.error('Error while cleaning chats :', error);
            }
        }
    }

    async clearAllChats() {
        if (confirm('You\'re about to delete all chats. Are you sure?')) {
            try {
                // Supprimer tous les chats de la base de données
                await fetch('/api/chats', { method: 'DELETE' });
                
                this.chats.clear();
                this.currentChatId = null;
                this.renderChatHistory();
                await this.createNewChat();
            } catch (error) {
                console.error('Error while deleting chats:', error);
            }
        }
    }

    renderChatHistory() {
        const chatArray = Array.from(this.chats.values())
            .sort((a, b) => b.updatedAt - a.updatedAt);
        
        this.elements.chatHistory.innerHTML = '';
        
        chatArray.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = `chat-item ${chat.id === this.currentChatId ? 'active' : ''}`;
            
            // Extraire le texte brut pour l'aperçu (sans markdown)
            const preview = chat.messages.length > 0 
                ? this.stripMarkdown(chat.messages[chat.messages.length - 1].content).substring(0, 50) + '...'
                : 'Empty chat';
            
            chatItem.innerHTML = `
                <div class="chat-item-title">${this.escapeHtml(chat.title)}</div>
                <div class="chat-item-preview">${this.escapeHtml(preview)}</div>
                <div class="chat-item-actions">
                    <button class="chat-action-btn" onclick="app.deleteChat('${chat.id}')">🗑</button>
                </div>
            `;
            
            chatItem.addEventListener('click', (e) => {
                if (!e.target.classList.contains('chat-action-btn')) {
                    this.loadChat(chat.id);
                }
            });
            
            this.elements.chatHistory.appendChild(chatItem);
        });
    }

    renderCurrentChat() {
        if (!this.currentChatId || !this.chats.has(this.currentChatId)) {
            this.showEmptyState();
            return;
        }
        
        const chat = this.chats.get(this.currentChatId);
        this.elements.messages.innerHTML = '';
        
        if (chat.messages.length === 0) {
            this.showEmptyState();
        } else {
            chat.messages.forEach(message => {
                this.addMessageToDOM(message.content, message.sender, false);
            });
        }
    }

    showEmptyState() {
        this.elements.messages.innerHTML = `
            <div class="empty-state">
                <h2>Ready to chat</h2>
                <p>Select a model and start conversation</p>
            </div>
        `;
        this.elements.emptyState = this.elements.messages.querySelector('.empty-state');
    }

    async updateChatTitle(chatId, firstMessage) {
        if (this.chats.has(chatId)) {
            const chat = this.chats.get(chatId);
            if (chat.title === 'New chat') {
                // Extraire le texte brut pour le titre
                const cleanMessage = this.stripMarkdown(firstMessage);
                chat.title = cleanMessage.length > 30 
                    ? cleanMessage.substring(0, 30) + '...'
                    : cleanMessage;
                chat.updatedAt = new Date();
                
                // Mettre à jour en base de données
                await fetch(`/api/chats/${chatId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: chat.title,
                        updatedAt: chat.updatedAt.toISOString()
                    })
                });
                
                this.renderChatHistory();
            }
        }
    }

    // Fonction pour obtenir le contexte des messages précédents
    getContextMessages(chat) {
        // Prendre les derniers messages selon contextSize
        const maxMessages = this.contextSize * 2; // user + assistant pairs
        const contextMessages = chat.messages.slice(-maxMessages);
        
        console.log(`Contexte: ${contextMessages.length} messages sur ${chat.messages.length} total`);
        
        return contextMessages;
    }

    // Utilitaire pour supprimer le markdown d'un texte
    stripMarkdown(text) {
        if (!text) return '';
        
        return text
            .replace(/#{1,6}\s+/g, '') // Headers
            .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
            .replace(/\*(.*?)\*/g, '$1') // Italic
            .replace(/`(.*?)`/g, '$1') // Inline code
            .replace(/```[\s\S]*?```/g, '[Code Block]') // Code blocks
            .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Links
            .replace(/>/g, '') // Blockquotes
            .replace(/[-*+]\s+/g, '') // List items
            .replace(/\d+\.\s+/g, '') // Numbered lists
            .replace(/\n+/g, ' ') // Multiple newlines
            .trim();
    }

    // Utilitaire pour échapper le HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Ajouter un bouton de copie aux blocs de code
    addCopyButtonToCodeBlocks(messageElement) {
        const codeBlocks = messageElement.querySelectorAll('pre');
        codeBlocks.forEach((block, index) => {
            const container = document.createElement('div');
            container.className = 'code-block-container';
            
            const copyBtn = document.createElement('button');
            copyBtn.className = 'code-copy-btn';
            copyBtn.textContent = 'Copy';
            copyBtn.onclick = () => {
                const code = block.querySelector('code')?.textContent || block.textContent;
                navigator.clipboard.writeText(code).then(() => {
                    copyBtn.textContent = 'Copied!';
                    setTimeout(() => {
                        copyBtn.textContent = 'Copy';
                    }, 2000);
                });
            };
            
            block.parentNode.insertBefore(container, block);
            container.appendChild(block);
            container.appendChild(copyBtn);
        });
    }

    async saveChatToDatabase(chat) {
        try {
            await fetch('/api/chats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    chat: {
                        id: chat.id,
                        title: chat.title,
                        createdAt: chat.createdAt.toISOString(),
                        updatedAt: chat.updatedAt.toISOString(),
                        messages: chat.messages.map(msg => ({
                            ...msg,
                            timestamp: msg.timestamp.toISOString()
                        }))
                    }
                })
            });
        } catch (error) {
            console.error('Error while saving chat : ', error);
        }
    }

    async saveMessageToDatabase(chatId, message) {
        try {
            await fetch(`/api/chats/${chatId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: {
                        sender: message.sender,
                        content: message.content,
                        timestamp: message.timestamp.toISOString()
                    }
                })
            });
        } catch (error) {
            console.error('Error while trying to save messages', error);
        }
    }

    async loadChatHistory() {
        try {
            const response = await fetch('/api/chats');
            const chatsData = await response.json();
            
            this.chats.clear();
            
            chatsData.forEach(chatData => {
                const chat = {
                    id: chatData.id,
                    title: chatData.title,
                    createdAt: new Date(chatData.createdAt),
                    updatedAt: new Date(chatData.updatedAt),
                    messages: chatData.messages.map(msg => ({
                        sender: msg.sender,
                        content: msg.content,
                        timestamp: new Date(msg.timestamp)
                    }))
                };
                this.chats.set(chat.id, chat);
            });
            
            // Sélectionner le chat le plus récent
            if (this.chats.size > 0) {
                const latestChat = Array.from(this.chats.values())
                    .sort((a, b) => b.updatedAt - a.updatedAt)[0];
                this.currentChatId = latestChat.id;
            }
            
            this.renderChatHistory();
            this.renderCurrentChat();
        } catch (error) {
            console.error('Error while downloading chats:', error);
            // Créer un nouveau chat si erreur
            await this.createNewChat();
        }
        
        // Créer un chat initial si aucun n'existe
        if (this.chats.size === 0) {
            await this.createNewChat();
        }
        
        this.loadSidebarState();
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('ollama-theme') || 'dark-theme';
        this.setTheme(savedTheme);
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'dark-theme' ? 'light-theme' : 'dark-theme';
        this.setTheme(newTheme);
    }

    setTheme(theme) {
        document.body.className = theme;
        this.currentTheme = theme;
        this.elements.themeToggle.textContent = theme === 'dark-theme' ? '☀️' : '🌙';
        localStorage.setItem('ollama-theme', theme);
    }

    autoResize(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    async initialize() {
        await this.checkStatus();
        await this.loadModels();
        setInterval(() => this.checkStatus(), 30000);
    }

    async checkStatus() {
        try {
            const response = await fetch('/api/status');
            const data = await response.json();
            
            if (data.status === 'connected') {
                this.elements.statusDot.classList.add('connected');
                this.elements.statusText.textContent = 'Connected';
            } else {
                this.elements.statusDot.classList.remove('connected');
                this.elements.statusText.textContent = 'Disconnected';
            }
        } catch {
            this.elements.statusText.textContent = 'Error';
        }
    }

    async loadModels() {
        try {
            const response = await fetch('/api/models');
            const data = await response.json();
            
            this.elements.modelSelect.innerHTML = '';
            
            if (data.models?.length > 0) {
                data.models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.name;
                    option.textContent = model.name;
                    this.elements.modelSelect.appendChild(option);
                });
                
                this.currentModel = data.models[0].name;
                this.elements.modelSelect.value = this.currentModel;
            } else {
                this.elements.modelSelect.innerHTML = '<option value="">No model available</option>';
            }
        } catch {
            this.elements.modelSelect.innerHTML = '<option value="">Error</option>';
        }
    }

    handleKeyDown(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
        }
    }

    async sendMessage() {
        const prompt = this.elements.promptInput.value.trim();
        
        if (!prompt || !this.currentModel || this.isGenerating) return;
        
        if (!this.currentChatId) {
            await this.createNewChat();
        }
        
        const chat = this.chats.get(this.currentChatId);
        
        if (chat.messages.length === 0) {
            this.elements.emptyState?.remove();
        }
        
        this.isGenerating = true;
        this.elements.sendBtn.disabled = true;
        this.elements.loading.style.display = 'block';
        
        // Ajouter le message utilisateur
        const userMessage = { sender: 'user', content: prompt, timestamp: new Date() };
        chat.messages.push(userMessage);
        this.addMessageToDOM(prompt, 'user');
        
        // Sauvegarder le message en base
        await this.saveMessageToDatabase(this.currentChatId, userMessage);
        
        // Mettre à jour le titre si c'est le premier message
        if (chat.messages.length === 1) {
            await this.updateChatTitle(this.currentChatId, prompt);
        }
        
        this.elements.promptInput.value = '';
        this.elements.promptInput.style.height = 'auto';
        
        try {
            await this.handleStreamingResponse(prompt, chat);
        } catch (error) {
            console.error('Error:', error);
            const errorMessage = { sender: 'assistant', content: '❌ Error during generation', timestamp: new Date() };
            chat.messages.push(errorMessage);
            this.addMessageToDOM('❌ Error during generation', 'assistant');
            await this.saveMessageToDatabase(this.currentChatId, errorMessage);
        } finally {
            this.isGenerating = false;
            this.elements.sendBtn.disabled = false;
            this.elements.loading.style.display = 'none';
            
            // Mettre à jour le timestamp du chat
            chat.updatedAt = new Date();
            await fetch(`/api/chats/${this.currentChatId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: chat.title,
                    updatedAt: chat.updatedAt.toISOString()
                })
            });
            
            this.renderChatHistory();
        }
    }

    async handleStreamingResponse(prompt, chat) {
        // Obtenir les messages de contexte (exclure le dernier message qui vient d'être ajouté)
        const contextMessages = this.getContextMessages({
            ...chat,
            messages: chat.messages.slice(0, -1) // Exclure le message qu'on vient d'ajouter
        });

        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: this.currentModel,
                prompt: prompt,
                stream: true,
                messages: contextMessages // Envoyer le contexte au serveur
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
            
            // Rendre le markdown en temps réel
            this.updateMessageContent(assistantMessage, fullResponse);
            this.scrollToBottom();
        }
        
        // Sauvegarder la réponse de l'assistant
        const assistantMsg = { sender: 'assistant', content: fullResponse, timestamp: new Date() };
        chat.messages.push(assistantMsg);
        await this.saveMessageToDatabase(this.currentChatId, assistantMsg);
    }

    updateMessageContent(messageElement, content) {
        if (messageElement.classList.contains('assistant')) {
            // Rendu markdown pour les messages de l'assistant
            if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
                const html = marked.parse(content);
                const cleanHtml = DOMPurify.sanitize(html);
                messageElement.innerHTML = cleanHtml;
                
                // Ajouter les boutons de copie pour les blocs de code
                this.addCopyButtonToCodeBlocks(messageElement);
                
                // Re-highlight le code si Prism est disponible
                if (typeof Prism !== 'undefined') {
                    Prism.highlightAllUnder(messageElement);
                }
            } else {
                messageElement.textContent = content;
            }
        } else {
            // Texte brut pour les messages utilisateur
            messageElement.textContent = content;
        }
    }

    addMessageToDOM(content, sender, scrollToBottom = true) {
        const message = document.createElement('div');
        message.className = `message ${sender}`;
        
        // Utiliser la fonction updateMessageContent pour le rendu
        this.updateMessageContent(message, content);
        
        this.elements.messages.appendChild(message);
        if (scrollToBottom) {
            this.scrollToBottom();
        }
        return message;
    }

    scrollToBottom() {
        this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
    }
}

// Initialize the application when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new OllamaChat();
});