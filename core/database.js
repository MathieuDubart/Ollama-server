const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = new sqlite3.Database(path.join(__dirname, 'chats.db'));
        this.init();
    }

    init() {
        this.db.serialize(() => {
            this.db.run(`
                CREATE TABLE IF NOT EXISTS chats (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            this.db.run(`
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    chat_id TEXT NOT NULL,
                    sender TEXT NOT NULL,
                    content TEXT NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (chat_id) REFERENCES chats (id) ON DELETE CASCADE
                )
            `);

            this.db.run(`
                CREATE TABLE IF NOT EXISTS files (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    message_id INTEGER NOT NULL,
                    filename TEXT NOT NULL,
                    original_name TEXT NOT NULL,
                    file_path TEXT NOT NULL,
                    file_size INTEGER NOT NULL,
                    mime_type TEXT NOT NULL,
                    content TEXT,
                    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (message_id) REFERENCES messages (id) ON DELETE CASCADE
                )
            `);
        });
    }

    saveChat(chat) {
        return new Promise((resolve, reject) => {
            const { id, title, createdAt, updatedAt } = chat;
            this.db.run(
                `INSERT OR REPLACE INTO chats (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)`,
                [id, title, createdAt.toISOString(), updatedAt.toISOString()],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    saveMessage(chatId, message) {
        return new Promise((resolve, reject) => {
            const { sender, content, timestamp } = message;
            this.db.run(
                `INSERT INTO messages (chat_id, sender, content, timestamp) VALUES (?, ?, ?, ?)`,
                [chatId, sender, content, timestamp.toISOString()],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    saveFile(messageId, fileData) {
        return new Promise((resolve, reject) => {
            const { filename, originalName, filePath, fileSize, mimeType, content } = fileData;
            this.db.run(
                `INSERT INTO files (message_id, filename, original_name, file_path, file_size, mime_type, content) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [messageId, filename, originalName, filePath, fileSize, mimeType, content],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    getAllChats() {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT * FROM chats ORDER BY updated_at DESC`,
                [],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    getChatMessages(chatId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT m.*, f.id as file_id, f.filename, f.original_name, f.file_size, f.mime_type, f.content as file_content
                 FROM messages m LEFT JOIN files f ON m.id = f.message_id
                 WHERE m.chat_id = ? ORDER BY m.timestamp ASC`,
                [chatId],
                (err, rows) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    const messagesMap = new Map();
                    
                    rows.forEach(row => {
                        if (!messagesMap.has(row.id)) {
                            messagesMap.set(row.id, {
                                id: row.id,
                                chat_id: row.chat_id,
                                sender: row.sender,
                                content: row.content,
                                timestamp: row.timestamp,
                                files: []
                            });
                        }
                        
                        if (row.file_id) {
                            messagesMap.get(row.id).files.push({
                                id: row.file_id,
                                filename: row.filename,
                                originalName: row.original_name,
                                fileSize: row.file_size,
                                mimeType: row.mime_type,
                                content: row.file_content
                            });
                        }
                    });

                    resolve(Array.from(messagesMap.values()));
                }
            );
        });
    }

    getMessageFiles(messageId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT * FROM files WHERE message_id = ?`,
                [messageId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    deleteChat(chatId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `DELETE FROM chats WHERE id = ?`,
                [chatId],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    clearChatMessages(chatId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `DELETE FROM messages WHERE chat_id = ?`,
                [chatId],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    deleteAllChats() {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run(`DELETE FROM files`, (err) => {
                    if (err) reject(err);
                });
                this.db.run(`DELETE FROM messages`, (err) => {
                    if (err) reject(err);
                });
                this.db.run(`DELETE FROM chats`, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });
    }

    updateChat(chatId, updates) {
        return new Promise((resolve, reject) => {
            const { title, updatedAt } = updates;
            this.db.run(
                `UPDATE chats SET title = ?, updated_at = ? WHERE id = ?`,
                [title, updatedAt.toISOString(), chatId],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    close() {
        this.db.close();
    }
}

module.exports = Database;