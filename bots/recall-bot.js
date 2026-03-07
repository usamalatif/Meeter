const axios = require('axios')

const RECALL_API_BASE = `https://${process.env.RECALL_REGION || 'us-east-1'}.recall.ai/api/v1`

const recallClient = axios.create({
  baseURL: RECALL_API_BASE,
  headers: {
    Authorization: `Token ${process.env.RECALL_API_KEY}`,
    'Content-Type': 'application/json'
  }
})

async function createRecallBot(meetingUrl, meetingId) {
  const webhookBase = process.env.API_URL
  if (!webhookBase) throw new Error('API_URL env var required for Recall webhooks')

  const { data } = await recallClient.post('/bot', {
    meeting_url: meetingUrl,
    bot_name: process.env.BOT_DISPLAY_NAME || 'Aria (AI Assistant)',
    metadata: { meetingId },
    recording_config: {
      transcript: {
        provider: { meeting_captions: {} }
      },
      realtime_endpoints: [
        {
          type: 'webhook',
          url: `${webhookBase}/webhooks/recall/transcript`,
          events: ['transcript.data'],
          metadata: { meetingId }
        },
        {
          type: 'webhook',
          url: `${webhookBase}/webhooks/recall/status`,
          events: ['bot.done', 'bot.fatal', 'bot.call_ended'],
          metadata: { meetingId }
        }
      ]
    }
  })

  console.log(`[Recall] Bot created: ${data.id} for meeting: ${meetingId}`)
  return data
}

async function stopRecallBot(recallBotId) {
  await recallClient.post(`/bot/${recallBotId}/leave_call`)
  console.log(`[Recall] Bot ${recallBotId} told to leave`)
}

async function getRecallBot(recallBotId) {
  const { data } = await recallClient.get(`/bot/${recallBotId}`)
  return data
}

async function speakInMeeting(recallBotId, audioUrl) {
  await recallClient.post(`/bot/${recallBotId}/output_audio`, {
    kind: 'mp3',
    data: { url: audioUrl }
  })
  console.log(`[Recall] Bot ${recallBotId} speaking: ${audioUrl}`)
}

module.exports = { createRecallBot, stopRecallBot, getRecallBot, speakInMeeting }
