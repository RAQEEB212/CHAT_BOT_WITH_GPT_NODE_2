// server.js

const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());

// Helper function to call OpenAI API
const getChatResponse = async (message) => {
    const apiUrl = 'https://api.openai.com/v1/chat/completions';

    try {
        const response = await axios.post(
            apiUrl,
            {
                model: "gpt-3.5-turbo",  // Using GPT-3.5 turbo model
                messages: [
                    {
                        role: "system",
                        content: "You are ChatGPT, a helpful assistant who can explain how to use system prompts for learning."
                    },
                    {
                        role: "user",
                        content: message
                    }
                ]
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('Error in OpenAI API request:', error);
        throw new Error('Failed to get a response from OpenAI.');
    }
};

// Routes
// POST: /chat - Send a message to GPT and get a response
app.post('/chat', async (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    try {
        const gptResponse = await getChatResponse(message);
        res.status(200).json({ response: gptResponse });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Chatbot API is running on http://localhost:${port}`);
});
