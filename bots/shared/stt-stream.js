const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk')

class DeepgramSTT {
  constructor() {
    this.client = createClient(process.env.DEEPGRAM_API_KEY)
    this.connection = null
    this.pendingResolvers = []
  }

  async connect() {
    this.connection = this.client.listen.live({
      model: 'nova-2',
      language: 'en-US',
      smart_format: true,
      diarize: true,
      punctuate: true,
      encoding: 'linear16',
      sample_rate: 16000,
      channels: 1,
      interim_results: false,
      utterance_end_ms: 1500,
    })

    this.connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      const alt = data.channel?.alternatives?.[0]
      if (!alt?.transcript) {
        if (this.pendingResolvers.length > 0) {
          this.pendingResolvers.shift()(null)
        }
        return
      }

      const result = {
        text: alt.transcript,
        confidence: alt.confidence,
        speakerId: alt.words?.[0]?.speaker || 0,
        timestamp: Date.now()
      }

      if (this.pendingResolvers.length > 0) {
        this.pendingResolvers.shift()(result)
      }
    })

    this.connection.on(LiveTranscriptionEvents.Error, (err) => {
      console.error('[DeepgramSTT] Error:', err)
    })

    return new Promise((resolve) => {
      this.connection.on(LiveTranscriptionEvents.Open, resolve)
    })
  }

  async processChunk(pcmBuffer) {
    if (!this.connection) await this.connect()

    return new Promise((resolve) => {
      this.pendingResolvers.push(resolve)
      this.connection.send(pcmBuffer)

      // Timeout after 5s if no response
      setTimeout(() => {
        const idx = this.pendingResolvers.indexOf(resolve)
        if (idx !== -1) {
          this.pendingResolvers.splice(idx, 1)
          resolve(null)
        }
      }, 5000)
    })
  }

  close() {
    if (this.connection) this.connection.finish()
  }
}

module.exports = { DeepgramSTT }
