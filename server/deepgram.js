const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk')

/**
 * Create a live Deepgram transcription session.
 *
 * @param {string} apiKey  Deepgram API key.
 * @param {{
 *   onOpen: () => void,
 *   onTranscript: (data: {text: string, isFinal: boolean, speechFinal: boolean}) => void,
 *   onUtteranceEnd: () => void,
 *   onError: (err: Error) => void,
 *   onClose: () => void,
 * }} callbacks
 * @returns {{ send(data: Buffer|ArrayBuffer): void, close(): void }}
 */
function createDeepgramSession(apiKey, callbacks) {
  const { onOpen, onTranscript, onUtteranceEnd, onError, onClose } = callbacks

  const client = createClient(apiKey)

  const connection = client.listen.live({
    model: 'nova-2',
    language: 'en-US',
    smart_format: true,
    interim_results: true,
    // No encoding — let Deepgram auto-detect webm/opus from MediaRecorder
    endpointing: 500,          // 500ms silence → marks speech_final = true
    utterance_end_ms: 1500,    // fallback: fires UtteranceEnd after 1.5s silence
    vad_events: true,
  })

  connection.on(LiveTranscriptionEvents.Open, () => {
    if (onOpen) onOpen()
  })

  connection.on(LiveTranscriptionEvents.Transcript, (data) => {
    if (!onTranscript) return
    const alt = data?.channel?.alternatives?.[0]
    if (!alt) return
    const text = alt.transcript ?? ''
    const isFinal = data.is_final ?? false
    const speechFinal = data.speech_final ?? false
    if (text) console.log(`[DG] transcript isFinal=${isFinal} speechFinal=${speechFinal}: "${text}"`)
    onTranscript({ text, isFinal, speechFinal })
  })

  connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
    console.log('[DG] UtteranceEnd fired')
    if (onUtteranceEnd) onUtteranceEnd()
  })

  connection.on(LiveTranscriptionEvents.Error, (err) => {
    const msg = err?.message || err?.error?.message || err?.type || JSON.stringify(err)
    console.error('[DG] Error detail:', msg, err)
    if (onError) onError(new Error(msg))
  })

  connection.on(LiveTranscriptionEvents.Close, () => {
    if (onClose) onClose()
  })

  return {
    send(data) {
      try {
        connection.send(data)
      } catch (e) {
        // ignore send errors on a closing connection
      }
    },
    close() {
      try {
        connection.finish()
      } catch (e) {
        // ignore
      }
    },
  }
}

module.exports = { createDeepgramSession }
