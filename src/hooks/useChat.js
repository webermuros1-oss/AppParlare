// Hook principal: maneja mensajes, estado y llamadas a la Groq API
import { useState, useCallback } from 'react'

// System prompt que fuerza inglés básico A1-A2
const SYSTEM_PROMPT = `You are a friendly English teacher for beginners.

STRICT RULES:
- ONLY use basic words (A1-A2 level, no advanced vocabulary)
- Write SHORT sentences (max 10 words each)
- Use simple grammar: present simple, past simple, basic future
- If the user makes a grammar mistake, correct it GENTLY with: "Good try! We say: [correct version]"
- Always encourage the user with positive words
- Ask ONE simple question at the end to keep conversation going
- NEVER use complex words like: utilize, commence, facilitate, subsequently, etc.
- Speak as if talking to a 10-year-old learning English for the first time`

// URL de la API de Groq (compatible con formato OpenAI)
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.1-8b-instant'

// Mensaje de bienvenida inicial
const WELCOME_MESSAGE = {
  role: 'assistant',
  content: "Hello! 👋 I am your English teacher. I will help you learn English. Let's start! How are you today?",
  id: Date.now(),
}

export function useChat() {
  const [messages, setMessages] = useState([WELCOME_MESSAGE])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Obtiene la API key desde variables de entorno de Vite
  const apiKey = import.meta.env.VITE_GROQ_API_KEY

  const sendMessage = useCallback(async (userText) => {
    if (!userText.trim() || loading) return

    setError(null)

    // Añade mensaje del usuario al historial
    const userMessage = { role: 'user', content: userText.trim(), id: Date.now() }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setLoading(true)

    try {
      // Verifica que existe la API key
      if (!apiKey || apiKey === 'your_groq_api_key_here') {
        throw new Error('API_KEY_MISSING')
      }

      // Prepara el historial para la API (sin el campo id que es solo interno)
      const apiMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...updatedMessages.map(({ role, content }) => ({ role, content })),
      ]

      // Llamada a la API de Groq
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: apiMessages,
          max_tokens: 200,      // Respuestas cortas para nivel básico
          temperature: 0.7,     // Algo de variedad pero consistente
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData?.error?.message || `HTTP ${response.status}`)
      }

      const data = await response.json()
      const assistantText = data.choices?.[0]?.message?.content

      if (!assistantText) throw new Error('Empty response from API')

      // Añade respuesta del asistente
      const assistantMessage = {
        role: 'assistant',
        content: assistantText,
        id: Date.now() + 1,
      }
      setMessages(prev => [...prev, assistantMessage])

    } catch (err) {
      // Manejo de errores con mensajes claros en español
      let errorMsg = 'Something went wrong. Try again!'

      if (err.message === 'API_KEY_MISSING') {
        errorMsg = '🔑 Check your Groq API key in the .env file. Get it free at console.groq.com'
      } else if (err.message.includes('401') || err.message.includes('invalid_api_key')) {
        errorMsg = '🔑 Invalid API key. Check your .env file. Get a free key at console.groq.com'
      } else if (err.message.includes('429')) {
        errorMsg = '⏳ Too many messages! Wait a moment and try again.'
      } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        errorMsg = '🌐 No internet connection. Check your network.'
      }

      setError(errorMsg)
      // Elimina el mensaje del usuario si hubo error (para que pueda intentar de nuevo)
      setMessages(prev => prev.filter(m => m.id !== userMessage.id))
    } finally {
      setLoading(false)
    }
  }, [messages, loading, apiKey])

  // Limpia el chat y vuelve al mensaje de bienvenida
  const clearChat = useCallback(() => {
    setMessages([{ ...WELCOME_MESSAGE, id: Date.now() }])
    setError(null)
  }, [])

  return { messages, loading, error, sendMessage, clearChat }
}
