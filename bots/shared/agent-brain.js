const OpenAI = require('openai')
const {
  AGENT_SYSTEM_PROMPT,
  POST_MEETING_SYSTEM_PROMPT,
  buildAgentCheckPrompt,
  buildPostMeetingPrompt
} = require('./prompts')

class AgentBrain {
  constructor(meetingState) {
    this.state = meetingState
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    this.checkModel = 'gpt-4o-mini'    // cheap — runs every 20s
    this.actionModel = 'gpt-4o'        // quality — post-meeting only
  }

  async evaluate() {
    const recentTranscript = this.state.getRecentTranscript(120)
    if (!recentTranscript.trim()) return { shouldSpeak: false }

    const response = await this.client.chat.completions.create({
      model: this.checkModel,
      max_tokens: 256,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: AGENT_SYSTEM_PROMPT },
        {
          role: 'user',
          content: buildAgentCheckPrompt({
            recentTranscript,
            openItems: this.state.openItems,
            decisions: this.state.decisions,
            agentSpeeches: this.state.agentSpeeches,
            silenceDuration: Date.now() - this.state.lastSpeechAt
          })
        }
      ]
    })

    this.state.updateLastAgentCheck()

    try {
      const text = response.choices[0].message.content
      const parsed = JSON.parse(text)

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
    const response = await this.client.chat.completions.create({
      model: this.actionModel,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: POST_MEETING_SYSTEM_PROMPT },
        {
          role: 'user',
          content: buildPostMeetingPrompt(fullTranscript, config)
        }
      ]
    })

    const text = response.choices[0].message.content
    return JSON.parse(text)
  }
}

module.exports = { AgentBrain }
