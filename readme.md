# Ollama Chat Server

A modern web interface for running and managing large language models locally using Ollama. Features include chat history, file uploads, dark/light themes, and conversation management.

## Prerequisites

- **RAM**: 32GB recommended (minimum 16GB for smaller models)
- **Storage**: 20-25GB per model + 2GB for application
- **OS**: macOS, Linux, or Windows
- **Node.js**: Version 16 or higher

## Installation

### 1. Install Ollama

Download and install Ollama from the [official website](https://ollama.com/download)

**macOS/Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows:**
Download the installer from the website and run it.

### 2. Clone and Setup the Project

```bash
# Clone the repository
git clone <repository-url>
cd ollama-server

# Install dependencies
npm install

# Copy required assets
npm run copy-assets
```

### 3. Download Models

Pull the models you want to use:

```bash
# Recommended models
ollama pull devstral        # Code-focused model (22GB)
ollama pull llama3.1:8b     # General purpose (4.7GB)
ollama pull codellama:7b    # Code generation (3.8GB)
ollama pull mistral:7b      # Efficient general model (4.1GB)

# List available models
ollama list
```

Browse more models at [Ollama Library](https://ollama.com/library)

## Usage

### 1. Start Ollama Service

```bash
ollama serve
```

Keep this terminal open - Ollama needs to run in the background.

### 2. Start the Web Interface

In a new terminal:

```bash
npm start
```

### 3. Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

## Features

### 🎨 **Modern Interface**
- Dark/light theme toggle
- Apple-inspired design
- Responsive layout for mobile/desktop

### 💬 **Chat Management**
- Create multiple chat sessions
- Rename and organize conversations
- Auto-save chat history
- Export/import chat data

### 📁 **File Support**
- Upload text files, code, JSON, CSV
- Automatic content analysis
- File preview in chat
- Supported formats: `.txt`, `.md`, `.js`, `.py`, `.html`, `.css`, `.json`, `.xml`, `.csv`

### 🔄 **Real-time Streaming**
- Live response generation
- Copy responses to clipboard
- Syntax highlighting for code blocks

### 💾 **Data Persistence**
- SQLite database for chat storage
- Automatic backups
- Import/export functionality

## API Endpoints

The server provides these REST endpoints:

```bash
GET    /api/status           # Check Ollama connection
GET    /api/models           # List available models
GET    /api/chats            # Get all chats
POST   /api/chats            # Save chat
PUT    /api/chats/:id        # Update chat
DELETE /api/chats/:id        # Delete chat
POST   /api/generate         # Generate response
POST   /api/upload           # Upload files
```

## Configuration

### Server Settings

Edit `server.js` to customize:

```javascript
const PORT = 3000;              // Web interface port
const OLLAMA_URL = 'http://localhost:11434';  // Ollama service URL
```

### File Upload Limits

Current limits:
- Max file size: 10MB
- Max files per upload: 10
- Supported MIME types: text/*, application/json, application/javascript

## Troubleshooting

### Common Issues

**❌ "Unable to retrieve models"**
```bash
# Check if Ollama is running
ollama list

# Restart Ollama service
ollama serve
```

**❌ "Connection refused"**
- Ensure Ollama is running on port 11434
- Check firewall settings
- Verify Ollama installation

**❌ "Model not found"**
```bash
# List installed models
ollama list

# Pull missing model
ollama pull <model-name>
```

**❌ High memory usage**
- Use smaller models (7B instead of 13B/70B)
- Close other applications
- Monitor with `ollama ps`

**❌ Slow responses**
- Check available RAM
- Use SSD storage
- Ensure model fits in memory

### Performance Tips

1. **Model Selection**: Start with smaller models (7B-8B parameters)
2. **Memory**: Close unused applications before running large models
3. **Storage**: Use SSD for better model loading times
4. **Context**: Limit conversation history for faster responses

### Logs and Debugging

```bash
# Check Ollama logs
ollama logs

# Check server logs
npm start --verbose

# Test API directly
curl http://localhost:11434/api/tags
```

## Development

### Project Structure

```
ollama-server/
├── public/           # Frontend files
│   ├── index.html   # Main interface
│   ├── style.css    # Styles
│   └── script.js    # Client logic
├── core/            # Backend modules
│   └── database.js  # SQLite database
├── uploads/         # File storage
├── server.js        # Express server
└── package.json     # Dependencies
```

### Available Scripts

```bash
npm start           # Start production server
npm run dev         # Start with nodemon (development)
npm run copy-assets # Copy required assets
npm test           # Run tests (if available)
```

### Adding New Features

1. **Frontend**: Modify files in `public/`
2. **Backend**: Update `server.js` or add modules in `core/`
3. **Database**: Extend schema in `core/database.js`

## Resources

- [Ollama Documentation](https://github.com/ollama/ollama/tree/main/docs)
- [Devstral Model](https://mistral.ai/news/devstral)
- [API Reference](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Model Library](https://ollama.com/library)
- [Ollama GitHub](https://github.com/ollama/ollama)

## License

This project is open source. Check the license file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

For bug reports and feature requests, please open an issue on GitHub.
