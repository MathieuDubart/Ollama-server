# Ollama Server

A simple server for running and managing large language models locally using Ollama.

## Prerequisites

- 32GB Ram
- Sufficient disk space for models (varies by model size, plan for 20-25GB per model)

## Installation

### 1. Install Ollama

Download the installer on [Ollama website's](https://ollama.com/download)

## Running the Server

Install dependencies with:  
```bash
npm install
```
Start the Ollama server:

```bash
# Pull models directly
ollama pull devstral

# Start the server
ollama serve
```

## API Usage

The server runs on `http://localhost:11434` by default.

## Web UI (Optional)

Run the UI with :
```bash
npm run start
```

Access at `http://localhost:3000`

## Troubleshooting

If you encounter issues:
- Ensure Ollama is running (`ollama serve`)
- Check system resources (memory/disk space)
- Verify model is downloaded correctly
- Check logs with `ollama logs`

## Resources

- [Ollama Documentation](https://github.com/ollama/ollama/tree/main/docs)
- [Devstral](https://mistral.ai/news/devstral)
- [API Reference](https://github.com/ollama/ollama/blob/main/docs/api.md)
