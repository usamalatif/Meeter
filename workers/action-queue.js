require('dotenv').config()

const { Queue, Worker } = require('bullmq')
const IORedis = require('ioredis')

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null
})

// Queue — always available for enqueueing (used by API server)
const postMeetingQueue = new Queue('post-meeting', { connection })

async function enqueuePostMeeting(meetingId, fullTranscript) {
  await postMeetingQueue.add('process', { meetingId, fullTranscript }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 }
  })
}

module.exports = { enqueuePostMeeting }

// Worker — only starts when this file is run directly (npm run worker)
if (require.main === module) {
  const { runPostMeetingPipeline } = require('../actions/post-meeting')

  const worker = new Worker('post-meeting', async (job) => {
    const { meetingId, fullTranscript } = job.data
    console.log(`[Worker] Processing post-meeting for: ${meetingId}`)
    const output = await runPostMeetingPipeline(meetingId, fullTranscript)
    return { success: true, meetingId, summary: output.summary }
  }, {
    connection,
    concurrency: 2,
    limiter: { max: 5, duration: 60000 }
  })

  worker.on('completed', (job) => console.log(`[Worker] Completed: ${job.id}`))
  worker.on('failed', (job, err) => console.error(`[Worker] Failed: ${job.id}`, err.message))

  console.log('[Worker] Action queue worker started')
}
