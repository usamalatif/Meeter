const axios = require('axios')

const RECALL_API_BASE = `https://${process.env.RECALL_REGION || 'us-east-1'}.recall.ai/api/v1`

// Minimal silent MP3 (1 frame, MPEG-1 Layer 3, 128kbps, 44100Hz)
// Required as a placeholder to enable the output_audio endpoint per Recall docs
const SILENT_MP3_B64 = Buffer.concat([
  Buffer.from([0xff, 0xfb, 0x90, 0x00]),
  Buffer.alloc(413)
]).toString('base64')

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
      }
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

async function getRecallTranscript(recallBotId) {
  const { data: bot } = await recallClient.get(`/bot/${recallBotId}`)
  console.log(`[Recall] bot keys:`, Object.keys(bot))
  console.log(`[Recall] bot.media_shortcuts:`, JSON.stringify(bot.media_shortcuts))
  console.log(`[Recall] bot.transcript:`, JSON.stringify(bot.transcript))

  const downloadUrl = bot.media_shortcuts?.transcript?.data?.download_url
    || bot.transcript?.download_url
  if (!downloadUrl) return ''

  const { data: segments } = await axios.get(downloadUrl)
  console.log(`[Recall] Transcript segments (first 2):`, JSON.stringify(segments?.slice(0, 2)))
  if (!Array.isArray(segments) || segments.length === 0) return ''

  return segments
    .map(seg => {
      const words = (seg.words || []).map(w => w.text).join(' ')
      return `Speaker ${seg.speaker || 'Unknown'}: ${words}`
    })
    .filter(line => line.trim())
    .join('\n')
}

async function speakInMeeting(recallBotId, b64Data) {
  await recallClient.post(`/bot/${recallBotId}/output_audio`, {
    kind: 'mp3',
    b64_data: b64Data
  })
  console.log(`[Recall] Bot ${recallBotId} speaking (${b64Data.length} b64 chars)`)
}

module.exports = { createRecallBot, stopRecallBot, getRecallBot, getRecallTranscript, speakInMeeting }
