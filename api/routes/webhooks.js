const router = require('express').Router()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const db = require('../../db')

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

module.exports = router
