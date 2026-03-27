import { useState, useRef, useCallback, useEffect } from 'react'

// ─── States ──────────────────────────────────────────────────────────────────
const STATES = {
  IDLE:        'idle',
  CONNECTING:  'connecting',
  LISTENING:   'listening',
  PROCESSING:  'processing',
  SPEAKING:    'speaking',
}

// ─── Constants ───────────────────────────────────────────────────────────────
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001'
const BARGE_IN_THRESHOLD = 25   // energy 0-255

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useVoiceConversation() {
  const [convState,    setConvState]    = useState(STATES.IDLE)
  const [partialText,  setPartialText]  = useState('')
  const [userText,     setUserText]     = useState('')
  const [aiText,       setAiText]       = useState('')
  const [error,        setError]        = useState(null)

  // Refs for use inside closures / rAF loops
  const wsRef          = useRef(null)
  const recorderRef    = useRef(null)
  const streamRef      = useRef(null)
  const animFrameRef   = useRef(null)
  const convStateRef   = useRef(STATES.IDLE)   // mirror of convState
  const analyserRef    = useRef(null)
  const audioCtxRef    = useRef(null)

  // Keep ref in sync
  useEffect(() => {
    convStateRef.current = convState
  }, [convState])

  // ─── Helpers ───────────────────────────────────────────────────────────────
  function sendWS(obj) {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(obj))
    }
  }

  // ─── VAD loop ──────────────────────────────────────────────────────────────
  function startVAD(stream) {
    try {
      const ctx      = new (window.AudioContext || window.webkitAudioContext)()
      const source   = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      audioCtxRef.current  = ctx
      analyserRef.current  = analyser

      const dataArr = new Uint8Array(analyser.frequencyBinCount)

      function loop() {
        animFrameRef.current = requestAnimationFrame(loop)
        analyser.getByteFrequencyData(dataArr)
        const avg = dataArr.reduce((s, v) => s + v, 0) / dataArr.length

        // Barge-in: user speaks while AI is talking
        if (convStateRef.current === STATES.SPEAKING && avg > BARGE_IN_THRESHOLD) {
          window.speechSynthesis.cancel()
          sendWS({ type: 'interrupt' })
          setConvState(STATES.LISTENING)
        }
      }

      loop()
    } catch (e) {
      console.warn('[VAD] Could not start AudioContext:', e)
    }
  }

  function stopVAD() {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }
    analyserRef.current = null
  }

  // ─── speakText ─────────────────────────────────────────────────────────────
  const speakText = useCallback((text) => {
    window.speechSynthesis.cancel()

    const utter    = new SpeechSynthesisUtterance(text)
    utter.lang     = 'en-US'
    utter.rate     = 0.9

    // Try to find an en-US voice
    const voices = window.speechSynthesis.getVoices()
    const enVoice = voices.find(v => v.lang.startsWith('en-US')) ||
                    voices.find(v => v.lang.startsWith('en'))
    if (enVoice) utter.voice = enVoice

    let done = false
    function handleDone() {
      if (done) return
      done = true
      sendWS({ type: 'speaking_done' })
      setConvState(STATES.LISTENING)
    }

    utter.onend   = handleDone
    utter.onerror = handleDone

    // Safety timeout
    const safetyTimer = setTimeout(() => {
      if (convStateRef.current === STATES.SPEAKING) {
        window.speechSynthesis.cancel()
        handleDone()
      }
    }, 15000)

    utter.onend = () => { clearTimeout(safetyTimer); handleDone() }
    utter.onerror = () => { clearTimeout(safetyTimer); handleDone() }

    setConvState(STATES.SPEAKING)
    window.speechSynthesis.speak(utter)
  }, [])

  // ─── stop ──────────────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    window.speechSynthesis.cancel()
    stopVAD()

    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop()
    }
    recorderRef.current = null

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }

    const ws = wsRef.current
    if (ws) {
      try { ws.send(JSON.stringify({ type: 'stop' })) } catch (_) {}
      ws.close()
      wsRef.current = null
    }

    setConvState(STATES.IDLE)
    setPartialText('')
  }, [])

  // ─── start ─────────────────────────────────────────────────────────────────
  const start = useCallback(async () => {
    setError(null)
    setConvState(STATES.CONNECTING)
    setPartialText('')
    setUserText('')
    setAiText('')

    // 1. Get mic
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
        },
      })
    } catch (e) {
      setError('Microphone access denied. Please allow microphone and try again.')
      setConvState(STATES.IDLE)
      return
    }
    streamRef.current = stream

    // 2. Connect WebSocket
    let ws
    try {
      ws = new WebSocket(WS_URL)
    } catch (e) {
      setError('Cannot connect to server. Run: cd server && npm start')
      stream.getTracks().forEach(t => t.stop())
      setConvState(STATES.IDLE)
      return
    }
    wsRef.current = ws
    ws.binaryType = 'arraybuffer'

    ws.onerror = () => {
      setError('Cannot connect to server. Run: cd server && npm start')
      setConvState(STATES.IDLE)
    }

    ws.onclose = () => {
      if (convStateRef.current !== STATES.IDLE) {
        setConvState(STATES.IDLE)
      }
    }

    ws.onmessage = (event) => {
      let msg
      try {
        msg = JSON.parse(event.data)
      } catch {
        return
      }

      switch (msg.type) {
        case 'state':
          // Map server state strings to our STATES enum values
          {
            const map = {
              idle:       STATES.IDLE,
              listening:  STATES.LISTENING,
              processing: STATES.PROCESSING,
              speaking:   STATES.SPEAKING,
            }
            if (map[msg.state]) setConvState(map[msg.state])
          }
          break

        case 'transcript':
          if (msg.isFinal) {
            setUserText(msg.text)
            setPartialText('')
          } else {
            setPartialText(msg.text)
          }
          break

        case 'response':
          setAiText(msg.text)
          speakText(msg.text)
          break

        case 'error':
          setError(msg.message)
          break

        default:
          break
      }
    }

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'start' }))

      // 3. MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      let recorder
      try {
        recorder = new MediaRecorder(stream, { mimeType })
      } catch (e) {
        setError('MediaRecorder not supported in this browser.')
        ws.close()
        stream.getTracks().forEach(t => t.stop())
        setConvState(STATES.IDLE)
        return
      }
      recorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          ws.send(e.data)
        }
      }

      recorder.start(100)   // emit chunks every 100 ms

      // 4. VAD
      startVAD(stream)
    }
  }, [speakText])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  return {
    convState,
    partialText,
    userText,
    aiText,
    error,
    start,
    stop,
    STATES,
  }
}
