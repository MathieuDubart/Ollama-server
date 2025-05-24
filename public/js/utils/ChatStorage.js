export class ChatStorage {
    constructor() {
        this.storageKey = 'ollama-chats';
        this.currentChatKey = 'ollama-current-chat';
    }

    save(chats, currentChatId) {
        try {
            const chatsData = {};
            chats.forEach((chat, chatId) => {
                chatsData[chatId] = chat;
            });
            
            localStorage.setItem(this.storageKey, JSON.stringify(chatsData));
            localStorage.setItem(this.currentChatKey, currentChatId);
        } catch (error) {
            // Silent fail
        }
    }

    load() {
        try {
            const savedChats = localStorage.getItem(this.storageKey);
            const savedCurrentChatId = localStorage.getItem(this.currentChatKey);
            
            if (savedChats) {
                const chatsData = JSON.parse(savedChats);
                const chats = new Map();
                
                Object.entries(chatsData).forEach(([chatId, chatData]) => {
                    chatData.createdAt = new Date(chatData.createdAt);
                    chatData.updatedAt = new Date(chatData.updatedAt);
                    
                    if (chatData.messages) {
                        chatData.messages.forEach(msg => {
                            if (msg.timestamp) {
                                msg.timestamp = new Date(msg.timestamp);
                            }
                        });
                    }
                    
                    chats.set(chatId, chatData);
                });
                
                return { chats, currentChatId: savedCurrentChatId };
            }
        } catch (error) {
            // Silent fail
        }
        
        return { chats: new Map(), currentChatId: null };
    }

    clear() {
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem(this.currentChatKey);
    }
}