const { generateZoomSignature } = require('./zoom-signature')
const { DeepgramSTT } = require('../shared/stt-stream')
const { AgentBrain } = require('../shared/agent-brain')
const { MeetingState } = require('../shared/meeting-state')
const { generateSpeech } = require('../shared/tts-engine')

class ZoomBot {
  constructor(meetingNumber, passcode, meetingId) {
    this.meetingNumber = meetingNumber
    this.passcode = passcode
    this.meetingId = meetingId
    this.state = new MeetingState(meetingId)
    this.stt = new DeepgramSTT()
    this.brain = new AgentBrain(this.state)
    this.client = null
    this.isActive = false
  }

  async join() {
    // Dynamically require Zoom SDK (only available in Electron context)
    const { ZoomMtgEmbedded } = require('@zoom/meetingsdk')
    this.client = ZoomMtgEmbedded.createClient()

    const meetingContainer = document.createElement('div')
    document.body.appendChild(meetingContainer)

    await this.client.init({
      zoomAppRoot: meetingContainer,
      language: 'en-US',
      customize: {
        video: { isResizable: false, viewSizes: { default: { width: 1, height: 1 } } },
        toolbar: { buttons: [] }
      }
    })

    await this.client.join({
      sdkKey: process.env.ZOOM_SDK_KEY,
      signature: generateZoomSignature(this.meetingNumber, 0),
      meetingNumber: this.meetingNumber,
      password: this.passcode,
      userName: process.env.BOT_DISPLAY_NAME || 'Aria (AI Assistant)',
      userEmail: 'bot@yourdomain.com',
    })

    this.isActive = true
    this._setupAudioCapture()
    this._setupEventListeners()
  }

  _setupAudioCapture() {
    this.client.on('audio-statistic-data-change', async (payload) => {
      const { buffer, speakerId } = payload.data
      if (!buffer || buffer.byteLength === 0) return

      const chunk = await this.stt.processChunk(Buffer.from(buffer))
      if (!chunk?.text) return

      await this.state.addTranscript({
        text: chunk.text,
        speaker: speakerId,
        timestamp: Date.now()
      })

      if (this.state.shouldRunAgentCheck()) {
        const decision = await this.brain.evaluate()
        if (decision.shouldSpeak) await this.speak(decision.message)
      }
    })
  }

  _setupEventListeners() {
    this.client.on('connection-change', async (payload) => {
      if (payload.state === 'Closed' || payload.state === 'Fail') {
        await this._handleMeetingEnd()
      }
    })
  }

  async speak(text) {
    const audioBuffer = await generateSpeech(text)
    await this.state.logAgentSpeech(text)
    console.log(`[ZoomBot] Agent spoke: ${text}`)
  }

  async _handleMeetingEnd() {
    this.isActive = false
    const { runPostMeetingPipeline } = require('../../actions/post-meeting')
    await runPostMeetingPipeline(this.meetingId, this.state.getFullTranscript())
  }
}

module.exports = { ZoomBot }
