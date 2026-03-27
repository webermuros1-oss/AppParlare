require('dotenv').config()
const Groq = require('groq-sdk')

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const SYSTEM_PROMPT =
  'You are a friendly English teacher for beginners. ' +
  'ONLY use basic words (A1-A2). ' +
  'Write SHORT sentences max 10 words. ' +
  'Correct mistakes gently. ' +
  'Ask ONE simple question at the end. ' +
  'Be warm and encouraging.'

/**
 * Call the Groq LLM with the current conversation history.
 * @param {Array<{role: string, content: string}>} history
 * @returns {Promise<string>} The assistant response text.
 */
async function getLLMResponse(history) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
  ]

  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages,
    max_tokens: 150,
    temperature: 0.7,
  })

  return completion.choices[0]?.message?.content ?? ''
}

module.exports = { getLLMResponse }
