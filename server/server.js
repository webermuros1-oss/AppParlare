require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const http = require('http')
const express = require('express')
const { WebSocketServer } = require('ws')
const { createDeepgramSession } = require('./deepgram')
const { getLLMResponse } = require('./llm')

const PORT = process.env.PORT || 3001

// Verify required keys on startup
if (!process.env.DEEPGRAM_API_KEY) console.error('❌ DEEPGRAM_API_KEY missing in server/.env')
else console.log('✅ DEEPGRAM_API_KEY loaded:', process.env.DEEPGRAM_API_KEY.slice(0, 8) + '...')
if (!process.env.GROQ_API_KEY) console.error('❌ GROQ_API_KEY missing in server/.env')
else console.log('✅ GROQ_API_KEY loaded')

const app = express()

// CORS — acepta el origen configurado (localhost en dev, Vercel en prod)
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173'
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

const server = http.createServer(app)
const wss = new WebSocketServer({ server })

wss.on('connection', (ws) => {
  console.log('[WS] Client connected')

  // --- Per-connection session state ---
  let dgSession = null
  let conversationHistory = []
  let sessionState = 'idle'        // 'idle' | 'listening' | 'processing' | 'speaking'
  let pendingTranscript = ''
  let isMuted = false              // true while AI is speaking — ignore Deepgram results

  // --- Helpers ---
  function sendJSON(obj) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(obj))
    }
  }

  function sendState() {
    sendJSON({ type: 'state', state: sessionState })
  }

  function setState(newState) {
    sessionState = newState
    sendState()
  }

  async function processUserTurn(text) {
    if (!text.trim()) return

    setState('processing')

    conversationHistory.push({ role: 'user', content: text })

    let response = ''
    try {
      response = await getLLMResponse(conversationHistory)
    } catch (err) {
      console.error('[LLM] Error:', err.message)
      sendJSON({ type: 'error', message: 'LLM error: ' + err.message })
      setState('listening')
      isMuted = false
      return
    }

    conversationHistory.push({ role: 'assistant', content: response })

    sendJSON({ type: 'response', text: response })

    isMuted = true
    setState('speaking')

    pendingTranscript = ''
  }

  // --- Deepgram callbacks ---
  function buildDgCallbacks() {
    return {
      onOpen() {
        console.log('[DG] Session open')
        setState('listening')
      },

      onTranscript({ text, isFinal, speechFinal }) {
        if (isMuted) return

        if (!isFinal) {
          // Partial transcript — send to client for display
          sendJSON({ type: 'transcript', text, isFinal: false })
          return
        }

        // Final transcript
        if (text.trim()) {
          pendingTranscript = (pendingTranscript + ' ' + text).trim()
          sendJSON({ type: 'transcript', text: pendingTranscript, isFinal: true })
        }

        if (speechFinal && pendingTranscript.trim()) {
          const toProcess = pendingTranscript
          pendingTranscript = ''
          processUserTurn(toProcess)
        }
      },

      onUtteranceEnd() {
        if (isMuted) return
        if (pendingTranscript.trim()) {
          const toProcess = pendingTranscript
          pendingTranscript = ''
          processUserTurn(toProcess)
        }
      },

      onError(err) {
        console.error('[DG] Error:', err.message || err)
        sendJSON({ type: 'error', message: 'Deepgram error: ' + (err.message || String(err)) })
      },

      onClose() {
        console.log('[DG] Session closed')
      },
    }
  }

  // --- WebSocket message handler ---
  ws.on('message', (data, isBinary) => {
    if (isBinary) {
      // Forward audio to Deepgram — SDK buffers internally until connection opens
      if (!isMuted && dgSession) {
        dgSession.send(data)
      }
      return
    }

    // Text / JSON control message
    let msg
    try {
      msg = JSON.parse(data.toString())
    } catch {
      console.warn('[WS] Non-JSON text message, ignoring')
      return
    }

    switch (msg.type) {
      case 'start': {
        console.log('[WS] start received')
        if (dgSession) {
          dgSession.close()
          dgSession = null
        }
        pendingTranscript = ''
        isMuted = false
        const apiKey = process.env.DEEPGRAM_API_KEY
        if (!apiKey) {
          sendJSON({ type: 'error', message: 'DEEPGRAM_API_KEY not set on server' })
          return
        }
        dgSession = createDeepgramSession(apiKey, buildDgCallbacks())
        break
      }

      case 'interrupt': {
        console.log('[WS] interrupt received')
        isMuted = false
        pendingTranscript = ''
        setState('listening')
        break
      }

      case 'speaking_done': {
        console.log('[WS] speaking_done received')
        isMuted = false
        setState('listening')
        break
      }

      case 'stop': {
        console.log('[WS] stop received')
        if (dgSession) {
          dgSession.close()
          dgSession = null
        }
        sessionState = 'idle'
        isMuted = false
        pendingTranscript = ''
        sendState()
        break
      }

      default:
        console.warn('[WS] Unknown message type:', msg.type)
    }
  })

  ws.on('close', () => {
    console.log('[WS] Client disconnected')
    if (dgSession) {
      dgSession.close()
      dgSession = null
    }
  })

  ws.on('error', (err) => {
    console.error('[WS] Socket error:', err.message)
  })
})

server.listen(PORT, () => {
  console.log(`[Server] Listening on http://localhost:${PORT}`)
  console.log(`[Server] WebSocket available at ws://localhost:${PORT}`)
})
