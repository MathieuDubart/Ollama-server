const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 3000;
const OLLAMA_URL = 'http://localhost:11434';

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

app.listen(PORT, () => {
    console.log(`🚀 Server started : http://localhost:${PORT}`);
    console.log(`📡 Connected to Ollama ${OLLAMA_URL}`);
});