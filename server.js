const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = 3000;

app.use(cors()); // Allow cross-origin requests
app.use(bodyParser.json()); // Parse JSON payloads

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/chatdb', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Define a schema for storing chat sessions
const chatSchema = new mongoose.Schema({
    sessionId: String,  // Unique session ID
    messages: [
        {
            role: String,    // 'user' or 'assistant'
            content: String, // The actual message content
            timestamp: { type: Date, default: Date.now }
        }
    ]
});

// Create a Chat model
const Chat = mongoose.model('Chat', chatSchema);

// Helper function to call OpenAI API with chat history
const getChatResponse = async (messages) => {
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: "gpt-3.5-turbo",  // GPT model version
                messages: messages,
                max_tokens: 2048, // Adjust this to allow for longer responses
                temperature: 0.7, // Adjust temperature for creativity
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        return response.data.choices[0].message.content; // Extract the response content
    } catch (error) {
        console.error('Error in OpenAI API request:', error.response?.data || error.message);
        throw new Error('Failed to get a response from OpenAI.');
    }
};

// POST: /chat - Handle new chat messages
app.post('/chat', async (req, res) => {
    const { sessionId, message } = req.body;

    if (!message || !sessionId) {
        return res.status(400).json({ error: 'Message and sessionId are required' });
    }

    try {
        // Find chat history for the given sessionId
        let chatSession = await Chat.findOne({ sessionId });

        if (!chatSession) {
            // If no session exists, create a new one
            chatSession = new Chat({ sessionId, messages: [] });
        }

        // Add the user's message to the session history
        chatSession.messages.push({ role: 'user', content: message });

        // Prepare messages with system prompt and history
        const formattedMessages = [
            {
                role: 'system',
                content: "You are a personal trainer and nutrition expert. Provide detailed workout plans, strength training tips, and personalized diet advice based on the user's fitness goals, such as muscle gain, weight loss, or general health improvement. Respond with structured, actionable steps in a friendly, motivational tone."
            },
            ...chatSession.messages.map(m => ({ role: m.role, content: m.content }))
        ];

        // Get the assistant's response
        const gptResponse = await getChatResponse(formattedMessages);

        // Add the assistant's message to the session history
        chatSession.messages.push({ role: 'assistant', content: gptResponse });

        // Save the updated session to the database
        await chatSession.save();

        // Return the assistant's response
        res.status(200).json({ response: gptResponse, sessionId });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Chatbot API is running on http://localhost:${port}`);
});
