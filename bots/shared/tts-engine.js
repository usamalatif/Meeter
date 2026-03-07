const OpenAI = require('openai')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const CACHE_DIR = path.join(__dirname, '..', '..', 'tts-cache')

// Pre-warm cache on startup with common agent phrases
const COMMON_PHRASES = [
  'Got it, noted.',
  'Just to confirm — who is taking ownership of that?',
  'Before we move on, that was not fully resolved.',
  'Could you clarify the deadline on that?',
  'Understood, I have logged that as an action item.',
  'Quick note — that topic came up last session too.',
  'Should we park that for a follow-up?',
  'Who is the best person to own this?',
]

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true })

async function generateSpeech(text) {
  const hash = crypto.createHash('md5').update(text).digest('hex')
  const filename = `${hash}.mp3`
  const cachePath = path.join(CACHE_DIR, filename)

  if (!fs.existsSync(cachePath)) {
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova',
      input: text,
      speed: 0.95,
    })
    const buffer = Buffer.from(await response.arrayBuffer())
    fs.writeFileSync(cachePath, buffer)
  }

  const fileBuffer = fs.readFileSync(cachePath)
  return { buffer: fileBuffer, b64Data: fileBuffer.toString('base64') }
}

async function preCacheCommonPhrases() {
  console.log('[TTS] Pre-caching common phrases...')
  for (const phrase of COMMON_PHRASES) {
    try {
      await generateSpeech(phrase)
    } catch (err) {
      console.error(`[TTS] Failed to cache phrase: ${err.message}`)
    }
  }
  console.log('[TTS] Pre-cache complete')
}

module.exports = { generateSpeech, preCacheCommonPhrases }
