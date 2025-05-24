const express = require('express');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Database = require('./core/database');

const app = express();
const PORT = 3000;
const OLLAMA_URL = 'http://localhost:11434';
const db = new Database();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'text/plain', 'text/csv', 'text/markdown', 'text/html',
            'application/json', 'application/javascript', 'application/xml',
            'text/css', 'text/x-python', 'text/x-java-source', 'text/x-c++src'
        ];
        
        if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('text/')) {
            cb(null, true);
        } else {
            cb(new Error('Unsupported file type'), false);
        }
    }
});

app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/models', async (req, res) => {
    try {
        const response = await axios.get(`${OLLAMA_URL}/api/tags`);
        res.json(response.data);
    } catch (error) {
        console.error('Error retrieving models:', error.message);
        res.status(500).json({ error: 'Unable to retrieve models' });
    }
});

app.post('/api/upload', upload.array('files', 10), async (req, res) => {
    try {
        const processedFiles = [];
        
        for (const file of req.files) {
            let content = '';
            
            if (file.mimetype.startsWith('text/') || 
                ['application/json', 'application/javascript', 'application/xml'].includes(file.mimetype)) {
                content = fs.readFileSync(file.path, 'utf8');
            }
            
            processedFiles.push({
                filename: file.filename,
                originalName: file.originalname,
                filePath: file.path,
                fileSize: file.size,
                mimeType: file.mimetype,
                content
            });
        }
        
        res.json({ 
            success: true, 
            files: processedFiles.map(f => ({
                filename: f.filename,
                originalName: f.originalName,
                fileSize: f.fileSize,
                mimeType: f.mimeType,
                content: f.content
            }))
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

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
                        id: msg.id,
                        sender: msg.sender,
                        content: msg.content,
                        timestamp: msg.timestamp,
                        files: msg.files || []
                    }))
                };
            })
        );
        res.json(chatsWithMessages);
    } catch (error) {
        console.error('Error retrieving chats:', error);
        res.status(500).json({ error: 'Unable to retrieve chats' });
    }
});

app.post('/api/chats', async (req, res) => {
    try {
        const { chat } = req.body;
        await db.saveChat({
            id: chat.id,
            title: chat.title,
            createdAt: new Date(chat.createdAt),
            updatedAt: new Date(chat.updatedAt)
        });

        for (const message of chat.messages) {
            const messageId = await db.saveMessage(chat.id, {
                sender: message.sender,
                content: message.content,
                timestamp: new Date(message.timestamp)
            });

            if (message.files?.length > 0) {
                for (const file of message.files) {
                    await db.saveFile(messageId, file);
                }
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error saving chat:', error);
        res.status(500).json({ error: 'Save failed' });
    }
});

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
        res.status(500).json({ error: 'Update failed' });
    }
});

app.post('/api/chats/:chatId/messages', async (req, res) => {
    try {
        const { chatId } = req.params;
        const { message } = req.body;
        
        const messageId = await db.saveMessage(chatId, {
            sender: message.sender,
            content: message.content,
            timestamp: new Date(message.timestamp)
        });

        if (message.files?.length > 0) {
            for (const file of message.files) {
                await db.saveFile(messageId, file);
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error saving message:', error);
        res.status(500).json({ error: 'Message save failed' });
    }
});

app.delete('/api/chats/:chatId', async (req, res) => {
    try {
        const { chatId } = req.params;
        await db.deleteChat(chatId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting chat:', error);
        res.status(500).json({ error: 'Delete failed' });
    }
});

app.delete('/api/chats/:chatId/messages', async (req, res) => {
    try {
        const { chatId } = req.params;
        await db.clearChatMessages(chatId);
        await db.updateChat(chatId, {
            title: 'New chat',
            updatedAt: new Date()
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Error clearing chat:', error);
        res.status(500).json({ error: 'Clear failed' });
    }
});

app.delete('/api/chats', async (req, res) => {
    try {
        await db.deleteAllChats();
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting all chats:', error);
        res.status(500).json({ error: 'Delete all failed' });
    }
});

function buildContextualPrompt(messages, currentPrompt, files = [], contextSize = 10) {
    const recentMessages = messages.slice(-contextSize * 2);
    let contextualPrompt = '';
    
    if (files?.length > 0) {
        contextualPrompt += "Files provided for analysis:\n\n";
        files.forEach(file => {
            contextualPrompt += `--- ${file.originalName} (${file.mimeType}) ---\n`;
            contextualPrompt += `${file.content}\n\n`;
        });
        contextualPrompt += "---\n\n";
    }
    
    if (recentMessages.length > 0) {
        contextualPrompt += "Conversation history:\n\n";
        recentMessages.forEach(msg => {
            const role = msg.sender === 'user' ? 'Human' : 'Assistant';
            contextualPrompt += `${role}: ${msg.content}\n\n`;
        });
    }
    
    contextualPrompt += `Human: ${currentPrompt}\n\nAssistant: `;
    return contextualPrompt;
}

app.post('/api/generate', async (req, res) => {
    const { model, prompt, stream = false, messages = [], files = [] } = req.body;

    if (!model || !prompt) {
        return res.status(400).json({ error: 'Model and prompt required' });
    }

    try {
        const contextualPrompt = buildContextualPrompt(messages, prompt, files, 5);
        
        console.log('Context sent to Ollama:', {
            originalPrompt: prompt,
            contextualPrompt: contextualPrompt.substring(0, 300) + '...',
            messagesCount: messages.length,
            filesCount: files?.length || 0
        });

        if (stream) {
            const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
                model,
                prompt: contextualPrompt,
                stream: true
            }, { responseType: 'stream' });

            res.setHeader('Content-Type', 'text/plain');
            res.setHeader('Transfer-Encoding', 'chunked');

            response.data.on('data', (chunk) => {
                const lines = chunk.toString().split('\n').filter(line => line.trim());

                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);
                        if (data.response) res.write(data.response);
                        if (data.done) res.end();
                    } catch (e) {}
                }
            });

            response.data.on('end', () => res.end());

        } else {
            const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
                model,
                prompt: contextualPrompt,
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
        console.error('Generation error:', error.message);
        res.status(500).json({
            error: 'Generation failed',
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
            error: 'Ollama unavailable',
            url: OLLAMA_URL
        });
    }
});

process.on('SIGINT', () => {
    console.log('\n🔄 Shutting down server...');
    db.close();
    process.exit(0);
});

app.listen(PORT, () => {
    console.log(`🚀 Server running: http://localhost:${PORT}`);
    console.log(`📡 Ollama endpoint: ${OLLAMA_URL}`);
    console.log(`💾 Database ready`);
});