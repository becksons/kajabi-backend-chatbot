import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import OpenAI from 'openai';
import fetch from 'node-fetch';

const app = express();
app.use(cors());
app.use(bodyParser.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID; // Replace with your actual search engine ID

async function performGoogleSearch(query) {
  const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}&cx=${GOOGLE_SEARCH_ENGINE_ID}`;
  const response = await fetch(url);
  const data = await response.json();

  if (data.items) {
    return data.items.map(item => `Title: ${item.title}\nSnippet: ${item.snippet}`).join("\n\n");
  } else {
    return "No relevant search results found.";
  }
}

app.post('/chat', async (req, res) => {
  try {
    const userMessage = req.body.message;

    // Step 1: Search Google for plugin/software suggestions
    const searchContext = await performGoogleSearch(userMessage);

    // Step 2: Send message to OpenAI with search context
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: "You are an expert audio engineer. Based on the user's musical goals, recommend mixing/mastering techniques and specific plugins and software (VSTs, DAWs, etc.). If you have external information provided, consider it in your answer. You speak in the tone and personality of a popular and professional, famous recording engineer"
        },
        {
          role: 'user',
          content: `Here is some context I found online: \n${searchContext}\n\nThe user says: ${userMessage}`
        }
      ]
    });

    res.json({ reply: completion.choices[0].message.content });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ reply: 'Sorry, something went wrong!' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));