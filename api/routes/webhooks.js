const express = require('express')
const router = express.Router()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const db = require('../../db')
const { getMeetingContext, removeMeeting } = require('../../bots/bot-orchestrator')
const { enqueuePostMeeting } = require('../../workers/action-queue')

const PLAN_QUOTAS = {
  price_starter_monthly: 500,
  price_growth_monthly: 1500,
  price_scale_monthly: 5000,
}

router.post('/stripe', async (req, res) => {
  let event
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('[Webhook] Signature verification failed:', err.message)
    return res.status(400).send(`Webhook error: ${err.message}`)
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        // Retrieve line items to get price ID
        const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ['line_items']
        })
        const priceId = fullSession.line_items?.data[0]?.price?.id
        await db.updateUserPlan(session.client_reference_id, {
          plan: 'active',
          minutesQuota: PLAN_QUOTAS[priceId] || 500,
          stripeCustomerId: session.customer
        })
        console.log(`[Webhook] User ${session.client_reference_id} upgraded`)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        await db.updateUserPlan(subscription.metadata.userId, {
          plan: 'trial',
          minutesQuota: 60
        })
        console.log(`[Webhook] Subscription cancelled for ${subscription.metadata.userId}`)
        break
      }

      case 'invoice.payment_failed': {
        await db.notifyUserPaymentFailed(event.data.object.customer)
        console.log(`[Webhook] Payment failed for customer ${event.data.object.customer}`)
        break
      }
    }
  } catch (err) {
    console.error('[Webhook] Processing error:', err)
  }

  res.json({ received: true })
})

// ─── Recall.ai — Real-time transcript ────────────────────────────────────────
// meetingId passed as ?meetingId= query param in the webhook URL
router.post('/recall/transcript', express.json(), async (req, res) => {
  res.json({ received: true }) // respond immediately so Recall doesn't retry

  try {
    const meetingId = req.query.meetingId
    if (!meetingId) return

    const context = getMeetingContext(meetingId)
    if (!context) return

    // recording_config realtime_endpoints payload:
    // { event: "transcript.data", data: { data: { words, participant }, bot: {...} } }
    const { event, data } = req.body
    if (event !== 'transcript.data') return

    const words = data?.data?.words || []
    const text = words.map(w => w.text).join(' ').trim()
    const speaker = data?.data?.participant?.name || 'Unknown'

    if (!text) return

    await context.state.addTranscript({ text, speaker, timestamp: Date.now() })
    console.log(`[Recall] [${meetingId}] ${speaker}: ${text}`)
  } catch (err) {
    console.error('[Webhook/Recall/Transcript] Error:', err.message)
  }
})

// ─── Recall.ai — Bot status changes ──────────────────────────────────────────
router.post('/recall/status', express.json(), async (req, res) => {
  res.json({ received: true })

  try {
    const { event, data } = req.body
    // meetingId from bot metadata (set at bot creation time)
    const meetingId = data?.bot?.metadata?.meetingId
    if (!meetingId) {
      console.warn('[Recall/Status] No meetingId in bot metadata:', JSON.stringify(data?.bot))
      return
    }

    console.log(`[Recall] Status event: ${event} for meeting: ${meetingId}`)

    if (event === 'bot.done') {
      removeMeeting(meetingId)
      // Mark completed immediately so frontend reflects it
      await db.updateMeetingStatus(meetingId, 'completed')
      // transcript.done fires separately when transcript is ready → triggers post-meeting
    }

    if (event === 'transcript.done') {
      const recallBotId = data?.bot?.id
      console.log(`[Recall] Transcript ready for meeting: ${meetingId}, bot: ${recallBotId}`)
      await enqueuePostMeeting(meetingId, recallBotId)
        .catch(e => console.error('[Recall] Failed to enqueue post-meeting job:', e.message))
    }

    if (event === 'transcript.failed') {
      console.error(`[Recall] Transcript failed for meeting: ${meetingId}`, JSON.stringify(data?.data))
    }

    if (event === 'bot.call_ended') {
      removeMeeting(meetingId)
    }

    if (event === 'bot.fatal') {
      console.error(`[Recall] Bot fatal error for meeting: ${meetingId}`)
      removeMeeting(meetingId)
      await db.updateMeetingStatus(meetingId, 'failed')
    }
  } catch (err) {
    console.error('[Webhook/Recall/Status] Error:', err.message)
  }
})

module.exports = router
