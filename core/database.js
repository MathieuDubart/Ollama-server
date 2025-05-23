const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = new sqlite3.Database(path.join(__dirname, 'chats.db'));
        this.init();
    }

    init() {
        this.db.serialize(() => {
            // Table des chats
            this.db.run(`
                CREATE TABLE IF NOT EXISTS chats (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Table des messages
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
        });
    }

    // Sauvegarder un chat
    saveChat(chat) {
        return new Promise((resolve, reject) => {
            const { id, title, createdAt, updatedAt } = chat;
            this.db.run(
                `INSERT OR REPLACE INTO chats (id, title, created_at, updated_at) 
                 VALUES (?, ?, ?, ?)`,
                [id, title, createdAt.toISOString(), updatedAt.toISOString()],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    // Sauvegarder un message
    saveMessage(chatId, message) {
        return new Promise((resolve, reject) => {
            const { sender, content, timestamp } = message;
            this.db.run(
                `INSERT INTO messages (chat_id, sender, content, timestamp) 
                 VALUES (?, ?, ?, ?)`,
                [chatId, sender, content, timestamp.toISOString()],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    // Récupérer tous les chats
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

    // Récupérer les messages d'un chat
    getChatMessages(chatId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT * FROM messages WHERE chat_id = ? ORDER BY timestamp ASC`,
                [chatId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    // Supprimer un chat
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

    // Vider les messages d'un chat
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

    // Supprimer tous les chats
    deleteAllChats() {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
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

    // Mettre à jour un chat
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