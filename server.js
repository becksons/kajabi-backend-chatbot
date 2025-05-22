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
const GOOGLE_SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID; 

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

    // first google plugin/software suggestions
    const searchContext = await performGoogleSearch(userMessage);

    // Step 2: Send search content response to openai
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: "You are an expert audio engineer who sounds like a professional, famous recording engineer. Recommend mixing/mastering techniques and specific plugins and software (VSTs, DAWs, etc.) based on what a musician is asking for. When possible, structure your answers clearly with bullet points, plugin names in bold, and separate sections like 'Suggested Plugins', 'Recommended DAWs', and 'Techniques'."
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