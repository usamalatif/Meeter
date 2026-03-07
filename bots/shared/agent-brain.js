const Anthropic = require('@anthropic-ai/sdk')
const {
  AGENT_SYSTEM_PROMPT,
  POST_MEETING_SYSTEM_PROMPT,
  buildAgentCheckPrompt,
  buildPostMeetingPrompt
} = require('./prompts')

class AgentBrain {
  constructor(meetingState) {
    this.state = meetingState
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    this.checkModel = 'claude-haiku-4-5-20251001'     // cheap — runs every 20s
    this.actionModel = 'claude-sonnet-4-20250514'      // quality — post-meeting only
  }

  async evaluate() {
    const recentTranscript = this.state.getRecentTranscript(120)
    if (!recentTranscript.trim()) return { shouldSpeak: false }

    const response = await this.client.messages.create({
      model: this.checkModel,
      max_tokens: 256,
      system: AGENT_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: buildAgentCheckPrompt({
          recentTranscript,
          openItems: this.state.openItems,
          decisions: this.state.decisions,
          agentSpeeches: this.state.agentSpeeches,
          silenceDuration: Date.now() - this.state.lastSpeechAt
        })
      }]
    })

    this.state.updateLastAgentCheck()

    try {
      const text = response.content[0].text
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())

      // Update state with detected items
      if (parsed.detectedItems) {
        if (parsed.detectedItems.newActionItem) {
          this.state.addActionItem(parsed.detectedItems.newActionItem)
        }
        if (parsed.detectedItems.newDecision) {
          this.state.addDecision(parsed.detectedItems.newDecision.description)
        }
        if (parsed.detectedItems.openQuestion) {
          this.state.addOpenItem(parsed.detectedItems.openQuestion.question)
        }
      }

      return parsed
    } catch (e) {
      console.error('[AgentBrain] Parse error:', e.message)
      return { shouldSpeak: false }
    }
  }

  async generatePostMeetingOutput(fullTranscript, config) {
    const response = await this.client.messages.create({
      model: this.actionModel,
      max_tokens: 2000,
      system: POST_MEETING_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: buildPostMeetingPrompt(fullTranscript, config)
      }]
    })

    const text = response.content[0].text
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  }
}

module.exports = { AgentBrain }
