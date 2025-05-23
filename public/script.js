class OllamaChat {
    constructor() {
        this.isGenerating = false;
        this.currentModel = '';
        this.currentTheme = 'dark-theme';
        this.chats = new Map();
        this.currentChatId = null;
        this.chatCounter = 0;
        
        this.initializeElements();
        this.attachEventListeners();
        this.loadTheme();
        this.loadChatHistory();
        this.initialize();
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
        // Save sidebar state
        localStorage.setItem('sidebar-collapsed', this.elements.sidebar.classList.contains('collapsed'));
    }

    openSidebar() {
        this.elements.sidebar.classList.remove('collapsed');
        this.updateSidebarReopener();
        // Save sidebar state
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

    createNewChat() {
        const chatId = `chat_${Date.now()}_${++this.chatCounter}`;
        const chat = {
            id: chatId,
            title: 'Nouveau chat',
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        this.chats.set(chatId, chat);
        this.currentChatId = chatId;
        this.renderChatHistory();
        this.renderCurrentChat();
        this.saveChatHistory();
    }

    loadChat(chatId) {
        if (this.chats.has(chatId)) {
            this.currentChatId = chatId;
            this.renderChatHistory();
            this.renderCurrentChat();
        }
    }

    deleteChat(chatId) {
        if (confirm('Êtes-vous sûr de vouloir supprimer ce chat ?')) {
            this.chats.delete(chatId);
            
            if (this.currentChatId === chatId) {
                // Load the most recent chat or create a new one
                const remainingChats = Array.from(this.chats.values())
                    .sort((a, b) => b.updatedAt - a.updatedAt);
                
                if (remainingChats.length > 0) {
                    this.currentChatId = remainingChats[0].id;
                } else {
                    this.createNewChat();
                    return;
                }
            }
            
            this.renderChatHistory();
            this.renderCurrentChat();
            this.saveChatHistory();
        }
    }

    clearCurrentChat() {
        if (this.currentChatId && this.chats.has(this.currentChatId)) {
            const chat = this.chats.get(this.currentChatId);
            chat.messages = [];
            chat.title = 'Nouveau chat';
            chat.updatedAt = new Date();
            
            this.renderChatHistory();
            this.renderCurrentChat();
            this.saveChatHistory();
        }
    }

    clearAllChats() {
        if (confirm('Êtes-vous sûr de vouloir supprimer tous les chats ?')) {
            this.chats.clear();
            this.currentChatId = null;
            this.renderChatHistory();
            this.createNewChat();
            this.saveChatHistory();
        }
    }

    renderChatHistory() {
        const chatArray = Array.from(this.chats.values())
            .sort((a, b) => b.updatedAt - a.updatedAt);
        
        this.elements.chatHistory.innerHTML = '';
        
        chatArray.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = `chat-item ${chat.id === this.currentChatId ? 'active' : ''}`;
            
            const preview = chat.messages.length > 0 
                ? chat.messages[chat.messages.length - 1].content.substring(0, 50) + '...'
                : 'Chat vide';
            
            chatItem.innerHTML = `
                <div class="chat-item-title">${chat.title}</div>
                <div class="chat-item-preview">${preview}</div>
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
                <h2>Prêt à discuter</h2>
                <p>Sélectionnez un modèle et commencez la conversation</p>
            </div>
        `;
        this.elements.emptyState = this.elements.messages.querySelector('.empty-state');
    }

    updateChatTitle(chatId, firstMessage) {
        if (this.chats.has(chatId)) {
            const chat = this.chats.get(chatId);
            if (chat.title === 'Nouveau chat') {
                chat.title = firstMessage.length > 30 
                    ? firstMessage.substring(0, 30) + '...'
                    : firstMessage;
                this.renderChatHistory();
            }
        }
    }

    saveChatHistory() {
        const chatsData = Array.from(this.chats.entries()).map(([id, chat]) => [
            id,
            {
                ...chat,
                createdAt: chat.createdAt.toISOString(),
                updatedAt: chat.updatedAt.toISOString()
            }
        ]);
        localStorage.setItem('ollama-chats', JSON.stringify(chatsData));
        localStorage.setItem('ollama-current-chat', this.currentChatId);
    }

    loadChatHistory() {
        const savedChats = localStorage.getItem('ollama-chats');
        const savedCurrentChat = localStorage.getItem('ollama-current-chat');
        
        if (savedChats) {
            try {
                const chatsData = JSON.parse(savedChats);
                this.chats = new Map(
                    chatsData.map(([id, chat]) => [
                        id,
                        {
                            ...chat,
                            createdAt: new Date(chat.createdAt),
                            updatedAt: new Date(chat.updatedAt)
                        }
                    ])
                );
                
                if (savedCurrentChat && this.chats.has(savedCurrentChat)) {
                    this.currentChatId = savedCurrentChat;
                }
                
                this.renderChatHistory();
                this.renderCurrentChat();
            } catch (error) {
                console.error('Erreur lors du chargement des chats:', error);
            }
        }
        
        // Create initial chat if none exists
        if (this.chats.size === 0) {
            this.createNewChat();
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
                this.elements.statusText.textContent = 'Connecté';
            } else {
                this.elements.statusDot.classList.remove('connected');
                this.elements.statusText.textContent = 'Déconnecté';
            }
        } catch {
            this.elements.statusText.textContent = 'Erreur';
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
                this.elements.modelSelect.innerHTML = '<option value="">Aucun modèle</option>';
            }
        } catch {
            this.elements.modelSelect.innerHTML = '<option value="">Erreur</option>';
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
        
        // Ensure we have a current chat
        if (!this.currentChatId) {
            this.createNewChat();
        }
        
        const chat = this.chats.get(this.currentChatId);
        
        // Hide empty state if first message
        if (chat.messages.length === 0) {
            this.elements.emptyState?.remove();
        }
        
        this.isGenerating = true;
        this.elements.sendBtn.disabled = true;
        this.elements.loading.style.display = 'block';
        
        // Add user message
        const userMessage = { sender: 'user', content: prompt, timestamp: new Date() };
        chat.messages.push(userMessage);
        this.addMessageToDOM(prompt, 'user');
        
        // Update chat title if it's the first message
        if (chat.messages.length === 1) {
            this.updateChatTitle(this.currentChatId, prompt);
        }
        
        this.elements.promptInput.value = '';
        this.elements.promptInput.style.height = 'auto';
        
        try {
            await this.handleStreamingResponse(prompt);
        } catch (error) {
            console.error('Erreur:', error);
            const errorMessage = { sender: 'assistant', content: '❌ Erreur lors de la génération', timestamp: new Date() };
            chat.messages.push(errorMessage);
            this.addMessageToDOM('❌ Erreur lors de la génération', 'assistant');
        } finally {
            this.isGenerating = false;
            this.elements.sendBtn.disabled = false;
            this.elements.loading.style.display = 'none';
            
            // Update chat timestamp and save
            chat.updatedAt = new Date();
            this.renderChatHistory();
            this.saveChatHistory();
        }
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
            assistantMessage.textContent = fullResponse;
            this.scrollToBottom();
        }
        
        // Save assistant message to chat
        const chat = this.chats.get(this.currentChatId);
        const assistantMsg = { sender: 'assistant', content: fullResponse, timestamp: new Date() };
        chat.messages.push(assistantMsg);
    }

    addMessageToDOM(content, sender, scrollToBottom = true) {
        const message = document.createElement('div');
        message.className = `message ${sender}`;
        message.textContent = content;
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