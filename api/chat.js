// Vercel serverless function — proxies Groq API server-side
// La key NUNCA sale al browser, vive solo en el servidor de Vercel
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY not configured on server' })
  }

  const { messages, max_tokens = 200, stream = false } = req.body

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages,
        max_tokens,
        temperature: 0.7,
        stream,
      }),
    })

    if (!response.ok) {
      const data = await response.json()
      return res.status(response.status).json(data)
    }

    if (stream) {
      // Retransmite el stream SSE de Groq directamente al cliente
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      for await (const chunk of response.body) {
        res.write(chunk)
      }
      res.end()
    } else {
      const data = await response.json()
      return res.status(200).json(data)
    }
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
