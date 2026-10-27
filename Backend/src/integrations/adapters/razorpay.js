import crypto from 'crypto'
import { basicAuth, httpJson } from '../http.js'

function auth(fields) {
  return { Authorization: basicAuth(fields.keyId, fields.keySecret) }
}

export async function test(fields) {
  await httpJson('https://api.razorpay.com/v1/payments?count=1', { headers: auth(fields) })
  return { ok: true, message: `Razorpay live (${fields.keyId.slice(0, 10)}…)` }
}

export async function createCheckout(fields, { amount, currency, receipt, notes }) {
  const cur = (currency || fields.currency || 'INR').toUpperCase()
  const paise = Math.round(Number(amount) * (cur === 'INR' ? 100 : 100))
  const order = await httpJson('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { ...auth(fields), 'Content-Type': 'application/json' },
    body: { amount: paise, currency: cur, receipt, notes },
  })
  return {
    provider: 'razorpay',
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: fields.keyId,
  }
}

export function verifyWebhook(fields, rawBody, signature) {
  if (!fields.webhookSecret) throw new Error('Razorpay webhook secret not saved')
  const expected = crypto.createHmac('sha256', fields.webhookSecret).update(rawBody).digest('hex')
  if (expected !== signature) throw new Error('Invalid Razorpay webhook signature')
  return true
}
