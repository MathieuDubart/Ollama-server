const express = require('express');
const axios = require('axios');
const path = require('path');
const Database = require('./core/database');

const app = express();
const PORT = 3000;
const OLLAMA_URL = 'http://localhost:11434';
const db = new Database();

app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/models', async (req, res) => {
    try {
        const response = await axios.get(`${OLLAMA_URL}/api/tags`);
        res.json(response.data);
    } catch (error) {
        console.error('Error retrieving models', error.message);
        res.status(500).json({ error: 'Impossible to retrieve models' });
    }
});

// Nouvelle route pour récupérer tous les chats
app.get('/api/chats', async (req, res) => {
    try {
        const chats = await db.getAllChats();
        const chatsWithMessages = await Promise.all(
            chats.map(async (chat) => {
                const messages = await db.getChatMessages(chat.id);
                return {
                    id: chat.id,
                    title: chat.title,
                    createdAt: chat.created_at,
                    updatedAt: chat.updated_at,
                    messages: messages.map(msg => ({
                        sender: msg.sender,
                        content: msg.content,
                        timestamp: msg.timestamp
                    }))
                };
            })
        );
        res.json(chatsWithMessages);
    } catch (error) {
        console.error('Error retrieving chats:', error);
        res.status(500).json({ error: 'Error retrieving chats' });
    }
});

// Nouvelle route pour sauvegarder un chat
app.post('/api/chats', async (req, res) => {
    try {
        const { chat } = req.body;
        await db.saveChat({
            id: chat.id,
            title: chat.title,
            createdAt: new Date(chat.createdAt),
            updatedAt: new Date(chat.updatedAt)
        });

        // Sauvegarder les messages
        for (const message of chat.messages) {
            await db.saveMessage(chat.id, {
                sender: message.sender,
                content: message.content,
                timestamp: new Date(message.timestamp)
            });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error saving chat:', error);
        res.status(500).json({ error: 'Error saving chat' });
    }
});

// Nouvelle route pour mettre à jour un chat
app.put('/api/chats/:chatId', async (req, res) => {
    try {
        const { chatId } = req.params;
        const { title, updatedAt } = req.body;
        
        await db.updateChat(chatId, {
            title,
            updatedAt: new Date(updatedAt)
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating chat:', error);
        res.status(500).json({ error: 'Error updating chat' });
    }
});

// Nouvelle route pour sauvegarder un message
app.post('/api/chats/:chatId/messages', async (req, res) => {
    try {
        const { chatId } = req.params;
        const { message } = req.body;
        
        await db.saveMessage(chatId, {
            sender: message.sender,
            content: message.content,
            timestamp: new Date(message.timestamp)
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error saving message:', error);
        res.status(500).json({ error: 'Error saving message' });
    }
});

// Nouvelle route pour supprimer un chat
app.delete('/api/chats/:chatId', async (req, res) => {
    try {
        const { chatId } = req.params;
        await db.deleteChat(chatId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting chat:', error);
        res.status(500).json({ error: 'Error deleting chat' });
    }
});

// Nouvelle route pour vider un chat
app.delete('/api/chats/:chatId/messages', async (req, res) => {
    try {
        const { chatId } = req.params;
        await db.clearChatMessages(chatId);
        await db.updateChat(chatId, {
            title: 'Nouveau chat',
            updatedAt: new Date()
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Error clearing chat:', error);
        res.status(500).json({ error: 'Error clearing chat' });
    }
});

// Nouvelle route pour supprimer tous les chats
app.delete('/api/chats', async (req, res) => {
    try {
        await db.deleteAllChats();
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting all chats:', error);
        res.status(500).json({ error: 'Error deleting all chats' });
    }
});

app.post('/api/generate', async (req, res) => {
    const { model, prompt, stream = false } = req.body;

    if (!model || !prompt) {
        return res.status(400).json({ error: 'Model and/or prompt are mandatory' });
    }

    try {
        if (stream) {
            const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
                model,
                prompt,
                stream: true
            }, {
                responseType: 'stream'
            });

            res.setHeader('Content-Type', 'text/plain');
            res.setHeader('Transfer-Encoding', 'chunked');

            response.data.on('data', (chunk) => {
                const lines = chunk.toString().split('\n').filter(line => line.trim());

                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);
                        if (data.response) {
                            res.write(data.response);
                        }
                        if (data.done) {
                            res.end();
                        }
                    } catch (e) {
                        // Ignore non-JSON lines
                    }
                }
            });

            response.data.on('end', () => {
                res.end();
            });

        } else {
            const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
                model,
                prompt,
                stream: false
            });

            res.json({
                response: response.data.response,
                model: response.data.model,
                created_at: response.data.created_at,
                done: response.data.done
            });
        }
    } catch (error) {
        console.error('Error while generating response:', error.message);
        res.status(500).json({
            error: 'Error while generating response',
            details: error.response?.data || error.message
        });
    }
});

app.get('/api/status', async (req, res) => {
    try {
        await axios.get(OLLAMA_URL);
        res.json({ status: 'connected', url: OLLAMA_URL });
    } catch (error) {
        res.status(503).json({
            status: 'disconnected',
            error: 'Ollama not available',
            url: OLLAMA_URL
        });
    }
});

// Fermer proprement la base de données à l'arrêt du serveur
process.on('SIGINT', () => {
    console.log('\n🔄 Fermeture du serveur...');
    db.close();
    process.exit(0);
});

app.listen(PORT, () => {
    console.log(`🚀 Server started : http://localhost:${PORT}`);
    console.log(`📡 Connected to Ollama ${OLLAMA_URL}`);
    console.log(`💾 Database initialized`);
});