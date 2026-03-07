class MeetingState {
  constructor(meetingId) {
    this.meetingId = meetingId
    this.transcript = []
    this.openItems = []
    this.decisions = []
    this.actionItems = []
    this.agentSpeeches = []
    this.lastAgentCheckAt = 0
    this.lastSpeechAt = Date.now()
    this.AGENT_CHECK_INTERVAL = 20000
  }

  async addTranscript({ text, speaker, timestamp }) {
    this.transcript.push({ text, speaker, timestamp })
    this.lastSpeechAt = timestamp
  }

  shouldRunAgentCheck() {
    const now = Date.now()
    const silenceSince = now - this.lastSpeechAt
    const timeSinceLastCheck = now - this.lastAgentCheckAt
    const wordCount = this.transcript.reduce((acc, t) => acc + t.text.split(' ').length, 0)

    // Only check if: 3s+ silence, 20s+ since last check, 100+ words transcribed
    return silenceSince >= 3000 && timeSinceLastCheck >= 20000 && wordCount >= 100
  }

  getRecentTranscript(lastNSeconds = 120) {
    const cutoff = Date.now() - (lastNSeconds * 1000)
    return this.transcript
      .filter(t => t.timestamp >= cutoff)
      .map(t => `Speaker ${t.speaker}: ${t.text}`)
      .join('\n')
  }

  getFullTranscript() {
    return this.transcript.map(t => `Speaker ${t.speaker}: ${t.text}`).join('\n')
  }

  async logAgentSpeech(text) {
    this.agentSpeeches.push({ text, timestamp: Date.now() })
    this.lastAgentCheckAt = Date.now()
  }

  updateLastAgentCheck() {
    this.lastAgentCheckAt = Date.now()
  }

  addOpenItem(item) {
    this.openItems.push(item)
  }

  addDecision(decision) {
    this.decisions.push(decision)
  }

  addActionItem(item) {
    this.actionItems.push(item)
  }
}

module.exports = { MeetingState }
