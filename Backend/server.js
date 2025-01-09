require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const BASE_API_URL = process.env.BASE_API_URL;
const LANGFLOW_ID = process.env.LANGFLOW_ID;
const APPLICATION_TOKEN = process.env.APPLICATION_TOKEN;
const PORT = process.env.PORT || 3001;

app.post('/api/chat', async (req, res) => {
    try {
        const { message, endpoint, outputType = "chat", inputType = "chat", tweaks = null } = req.body;
        
        const apiUrl = `${BASE_API_URL}/lf/${LANGFLOW_ID}/api/v1/run/${endpoint}`;
        
        const payload = {
            input_value: message,
            output_type: outputType,
            input_type: inputType,
            ...(tweaks && { tweaks })
        };

        const response = await axios.post(apiUrl, payload, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${APPLICATION_TOKEN}`
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
