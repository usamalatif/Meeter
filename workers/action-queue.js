require('dotenv').config()

const { Queue, Worker } = require('bullmq')
const IORedis = require('ioredis')
const { runPostMeetingPipeline } = require('../actions/post-meeting')

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null
})

// Queue for async post-meeting actions
const postMeetingQueue = new Queue('post-meeting', { connection })

// Worker processes jobs from the queue
const worker = new Worker('post-meeting', async (job) => {
  const { meetingId, fullTranscript } = job.data
  console.log(`[Worker] Processing post-meeting for: ${meetingId}`)

  try {
    const output = await runPostMeetingPipeline(meetingId, fullTranscript)
    return { success: true, meetingId, summary: output.summary }
  } catch (err) {
    console.error(`[Worker] Failed for ${meetingId}:`, err)
    throw err
  }
}, {
  connection,
  concurrency: 2,
  limiter: {
    max: 5,
    duration: 60000 // max 5 jobs per minute
  }
})

worker.on('completed', (job) => {
  console.log(`[Worker] Completed: ${job.id}`)
})

worker.on('failed', (job, err) => {
  console.error(`[Worker] Failed: ${job.id}`, err.message)
})

// Export for use in bot orchestrator
async function enqueuePostMeeting(meetingId, fullTranscript) {
  await postMeetingQueue.add('process', { meetingId, fullTranscript }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 }
  })
}

module.exports = { enqueuePostMeeting }

// If run directly, start the worker
if (require.main === module) {
  console.log('[Worker] Action queue worker started')
}
