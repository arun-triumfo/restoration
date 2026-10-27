import crypto from 'crypto'
import { formBody, httpJson } from '../http.js'

function auth(fields) {
  return { Authorization: `Bearer ${fields.secretKey}` }
}

export async function test(fields) {
  await httpJson('https://api.stripe.com/v1/balance', { headers: auth(fields) })
  return { ok: true, message: 'Stripe live: balance reachable' }
}

export async function createCheckout(fields, { amount, currency, successUrl, cancelUrl, plan }) {
  const cur = (currency || fields.currency || 'usd').toLowerCase()
  const body = formBody({
    'mode': 'payment',
    'success_url': successUrl,
    'cancel_url': cancelUrl,
    'line_items[0][price_data][currency]': cur,
    'line_items[0][price_data][product_data][name]': `RugOS ${plan || 'plan'}`,
    'line_items[0][price_data][unit_amount]': String(Math.round(Number(amount) * 100)),
    'line_items[0][quantity]': '1',
  })
  const session = await httpJson('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { ...auth(fields), 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  return { provider: 'stripe', sessionId: session.id, url: session.url }
}

export function verifyWebhook(fields, rawBody, header) {
  if (!fields.webhookSecret) throw new Error('Stripe webhook secret not saved')
  const parts = Object.fromEntries(
    String(header || '')
      .split(',')
      .map((p) => p.split('=').map((s) => s.trim())),
  )
  const signed = `${parts.t}.${rawBody}`
  const expected = crypto.createHmac('sha256', fields.webhookSecret).update(signed).digest('hex')
  if (expected !== parts.v1) throw new Error('Invalid Stripe webhook signature')
  return true
}
