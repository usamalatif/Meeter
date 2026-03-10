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

    // Only check if: 2s+ silence, 15s+ since last check, 20+ words transcribed
    return silenceSince >= 2000 && timeSinceLastCheck >= 15000 && wordCount >= 20
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

  // Full conversation with Aria's own questions interleaved in chronological order
  // This lets Aria see what she already asked and what was answered — preventing repeats
  getFullConversation() {
    const entries = [
      ...this.transcript.map(t => ({ timestamp: t.timestamp, speaker: t.speaker, text: t.text })),
      ...this.agentSpeeches.map(s => ({ timestamp: s.timestamp, speaker: 'Aria', text: s.text }))
    ]
    entries.sort((a, b) => a.timestamp - b.timestamp)
    return entries.map(e => `${e.speaker}: ${e.text}`).join('\n')
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
