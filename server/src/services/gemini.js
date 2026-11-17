// server/src/services/gemini.js
const { GoogleGenAI } = require('@google/genai');
const config = require('../config');

let genAIClient = null;

function getGeminiClient() {
  if (!config.geminiApiKey) {
    return null;
  }
  if (!genAIClient) {
    try {
      genAIClient = new GoogleGenAI({ apiKey: config.geminiApiKey });
    } catch (e) {
      console.warn('[Gemini] Initialization warning:', e.message);
      return null;
    }
  }
  return genAIClient;
}

async function generateChatCompletion({ systemInstruction, contents }) {
  const client = getGeminiClient();
  if (!client) {
    const err = new Error('AI assistant is currently unavailable.');
    err.status = 503;
    err.code = 'ASSISTANT_UNAVAILABLE';
    throw err;
  }

  try {
    const response = await client.models.generateContent({
      model: config.geminiModel || 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.2,
      },
    });

    const candidate = response.candidates && response.candidates[0];
    const textPart = candidate?.content?.parts?.[0]?.text || response.text || '';
    return textPart;
  } catch (err) {
    console.error('[Gemini API Error]:', err.message);
    const error = new Error('The AI assistant encountered a processing error.');
    error.status = 502;
    error.code = 'ASSISTANT_ERROR';
    throw error;
  }
}

module.exports = {
  getGeminiClient,
  generateChatCompletion,
};
