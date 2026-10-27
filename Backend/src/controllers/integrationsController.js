import { DEFAULT_TENANT_ID } from '../constants/tenant.js'
import { CATALOG, CHANNEL_IDS, publicCatalog } from '../integrations/catalog.js'
import {
  Creds,
  credId,
  decryptFields,
  mergeEncryptedFields,
  missingRequired,
  publicConnection,
} from '../integrations/creds.js'
import { ADAPTERS, runSync, runTest } from '../integrations/index.js'
import { getResourceModel } from '../models/createResourceModel.js'

function Orders() {
  return getResourceModel('orders', 'orderId', true)
}
function Skus() {
  return getResourceModel('skus', 'sku', true)
}
function Workers() {
  return getResourceModel('integration_workers', 'id', true)
}
function Failed() {
  return getResourceModel('failed_jobs', 'jobId', true)
}
function Tenants() {
  return getResourceModel('tenants', 'id', true)
}

function tenantIdOf(req) {
  return req.user?.tenantId || DEFAULT_TENANT_ID
}

function originOf(req) {
  return `${req.protocol}://${req.get('host')}`
}

export async function listConnections(req, res) {
  try {
    const tid = tenantIdOf(req)
    const rows = await Creds().find({ tenantId: tid }).lean()
    const by = Object.fromEntries(rows.map((r) => [r.channel, r]))
    const data = CHANNEL_IDS.map((ch) => publicConnection(by[ch], ch))
    res.json({ success: true, catalog: publicCatalog(originOf(req)), data })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function connectChannel(req, res) {
  try {
    const channel = String(req.params.channel || '').toLowerCase()
    const cat = CATALOG[channel]
    if (!cat) {
      return res.status(400).json({ success: false, message: `Unknown channel. Use: ${CHANNEL_IDS.join(', ')}` })
    }
    const tid = tenantIdOf(req)
    const incoming = { ...(req.body?.fields || req.body || {}) }
    // Back-compat aliases from the older 2-field form
    if (incoming.apiKey && !incoming.accessToken) incoming.accessToken = incoming.apiKey
    if (incoming.password && !incoming.apiKey) incoming.apiKey = incoming.password
    if (incoming.username && !incoming.email) incoming.email = incoming.username
    if (incoming.shopDomain && !incoming.email && cat.kind === 'courier') incoming.email = incoming.shopDomain

    const id = credId(tid, channel)
    const existing = await Creds().findOne({ id }).lean()
    const { fieldsEnc, fieldHints } = mergeEncryptedFields(existing?.fieldsEnc, incoming, cat)
    const mergedFields = decryptFields({ ...existing, fieldsEnc })
    const mode = req.body?.mode === 'sandbox' ? 'sandbox' : 'live'
    if (mode === 'live') {
      const miss = missingRequired(mergedFields, cat)
      if (miss.length) {
        return res.status(400).json({ success: false, message: `Missing: ${miss.join(', ')}` })
      }
    }

    const shopDomain = mergedFields.shopDomain || mergedFields.email || mergedFields.username || null
    const doc = await Creds()
      .findOneAndUpdate(
        { id },
        {
          $set: {
            id,
            channel,
            tenantId: tid,
            shopDomain,
            fieldsEnc,
            fieldHints,
            status: 'connected',
            lastError: null,
            secretEnc: '',
            secretHint: Object.values(fieldHints)[0] || null,
            meta: {
              mode,
              kind: cat.kind,
              connectedAt: new Date().toISOString(),
              connectedBy: req.user?.email,
            },
          },
        },
        { upsert: true, new: true },
      )
      .lean()

    let verify = null
    if (mode === 'live') {
      try {
        verify = await runTest(channel, mergedFields, 'live')
        await Creds().findOneAndUpdate(
          { id },
          { $set: { lastError: null, 'meta.lastVerifiedAt': new Date().toISOString() } },
        )
      } catch (err) {
        await Creds().findOneAndUpdate({ id }, { $set: { lastError: err.message, status: 'error' } })
        return res.status(400).json({
          success: false,
          connection: publicConnection({ ...doc, status: 'error', lastError: err.message }, channel),
          message: err.message,
        })
      }
    }

    await Workers().findOneAndUpdate(
      { id: `worker-${channel}-${tid}` },
      {
        $set: {
          id: `worker-${channel}-${tid}`,
          name: `${channel} sync`,
          channel,
          tenantId: tid,
          status: 'Idle',
          lastHeartbeat: new Date().toISOString(),
        },
      },
      { upsert: true },
    )

    res.json({
      success: true,
      connection: publicConnection(doc, channel),
      message: verify?.message || `${cat.label} saved (${mode}).`,
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function disconnectChannel(req, res) {
  try {
    const channel = String(req.params.channel || '').toLowerCase()
    const tid = tenantIdOf(req)
    await Creds().findOneAndUpdate(
      { id: credId(tid, channel), tenantId: tid },
      { $set: { status: 'disconnected', fieldsEnc: {}, lastError: null, secretEnc: '' } },
    )
    res.json({ success: true, message: `${channel} disconnected` })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function testChannel(req, res) {
  try {
    const channel = String(req.params.channel || '').toLowerCase()
    const tid = tenantIdOf(req)
    const doc = await Creds().findOne({ id: credId(tid, channel), tenantId: tid }).lean()
    if (!doc || doc.status === 'disconnected') {
      return res.status(400).json({ success: false, message: 'Save keys first' })
    }
    const fields = decryptFields(doc)
    const mode = doc.meta?.mode || 'sandbox'
    const result = await runTest(channel, fields, mode)
    await Creds().findOneAndUpdate(
      { id: doc.id },
      { $set: { lastError: null, status: 'connected', 'meta.lastVerifiedAt': new Date().toISOString() } },
    )
    res.json({ success: true, channel, mode, message: result.message })
  } catch (err) {
    const channel = String(req.params.channel || '').toLowerCase()
    const tid = tenantIdOf(req)
    await Creds()
      .findOneAndUpdate({ id: credId(tid, channel) }, { $set: { lastError: err.message } })
      .catch(() => {})
    res.status(400).json({ success: false, channel, message: err.message })
  }
}

export async function syncChannel(req, res) {
  const channel = String(req.params.channel || '').toLowerCase()
  const tid = tenantIdOf(req)
  const jobId = `job-${channel}-${Date.now()}`
  try {
    const cat = CATALOG[channel]
    if (cat?.kind !== 'marketplace') {
      return res.status(400).json({
        success: false,
        message: cat?.kind === 'courier' ? 'Couriers use Shipping Desk for rates and labels' : 'Not a marketplace',
      })
    }
    const cred = await Creds().findOne({ id: credId(tid, channel), tenantId: tid }).lean()
    if (!cred || cred.status === 'disconnected') {
      return res.status(400).json({ success: false, message: 'Save keys first' })
    }
    await Workers().findOneAndUpdate(
      { id: `worker-${channel}-${tid}` },
      { $set: { status: 'Running', lastHeartbeat: new Date().toISOString() } },
      { upsert: true },
    )
    const catalog = await Skus().find({ tenantId: tid }).limit(80).lean()
    const { imported, message } = await runSync(channel, decryptFields(cred), cred.meta?.mode || 'sandbox', {
      tenantId: tid,
      catalog,
    })
    const orderIds = []
    for (const row of imported) {
      await Orders().findOneAndUpdate({ orderId: row.orderId, tenantId: tid }, { $set: row }, { upsert: true })
      orderIds.push(row.orderId)
    }
    const now = new Date().toISOString()
    await Creds().findOneAndUpdate({ id: credId(tid, channel) }, { $set: { lastSyncAt: now, lastError: null, status: 'connected' } })
    await Workers().findOneAndUpdate(
      { id: `worker-${channel}-${tid}` },
      { $set: { status: 'Idle', lastHeartbeat: now, lastSyncAt: now, lastResult: `imported ${orderIds.length}` } },
    )
    res.json({ success: true, channel, imported: orderIds.length, orderIds, message })
  } catch (err) {
    await Failed()
      .create({
        jobId,
        channel,
        tenantId: tid,
        error: err.message,
        status: 'failed',
        createdAt: new Date().toISOString(),
      })
      .catch(() => {})
    await Creds()
      .findOneAndUpdate({ id: credId(tid, channel) }, { $set: { lastError: err.message, status: 'error' } })
      .catch(() => {})
    res.status(500).json({ success: false, message: err.message, jobId })
  }
}

const PLAN_PRICE = {
  starter: { INR: 0, USD: 0 },
  growth: { INR: 4900, USD: 59 },
  enterprise: { INR: 14900, USD: 179 },
}

export async function createCheckout(req, res) {
  try {
    const channel = String(req.params.channel || req.body?.provider || 'razorpay').toLowerCase()
    if (!['razorpay', 'stripe'].includes(channel)) {
      return res.status(400).json({ success: false, message: 'provider must be razorpay or stripe' })
    }
    const tid = tenantIdOf(req)
    const doc = await Creds().findOne({ id: credId(tid, channel), tenantId: tid }).lean()
    if (!doc || doc.status === 'disconnected') {
      return res.status(400).json({ success: false, message: `Save ${channel} keys on Integrations first` })
    }
    const fields = decryptFields(doc)
    const plan = String(req.body?.plan || 'growth').toLowerCase()
    const currency = String(req.body?.currency || fields.currency || (channel === 'razorpay' ? 'INR' : 'usd')).toUpperCase()
    const amount = Number(req.body?.amount) || PLAN_PRICE[plan]?.[currency] || PLAN_PRICE[plan]?.USD || 59
    if (!amount) {
      return res.json({ success: true, message: 'Starter is free — plan switched without checkout', free: true, plan })
    }
    const a = ADAPTERS[channel]
    const origin = originOf(req)
    const result = await a.createCheckout(fields, {
      amount,
      currency,
      receipt: `rugos-${tid}-${plan}-${Date.now()}`,
      notes: { tenantId: tid, plan },
      plan,
      successUrl: req.body?.successUrl || `${origin}/billing?paid=1`,
      cancelUrl: req.body?.cancelUrl || `${origin}/billing?paid=0`,
    })
    res.json({ success: true, ...result })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message })
  }
}

async function markPaid(tenantId, plan) {
  if (!tenantId) return
  const patch = { billingStatus: 'active', status: 'active' }
  if (plan) patch.plan = plan
  await Tenants().findOneAndUpdate({ id: tenantId }, { $set: patch })
}

export async function webhookRazorpay(req, res) {
  try {
    const tid = String(req.body?.payload?.order?.entity?.notes?.tenantId || req.query.tenantId || '')
    if (!tid) return res.status(400).json({ success: false, message: 'tenantId missing on payload' })
    const doc = await Creds().findOne({ id: credId(tid, 'razorpay') }).lean()
    if (doc) {
      const { verifyWebhook } = await import('../integrations/adapters/razorpay.js')
      verifyWebhook(decryptFields(doc), JSON.stringify(req.body), req.get('X-Razorpay-Signature'))
    }
    const plan = req.body?.payload?.order?.entity?.notes?.plan
    await markPaid(tid, plan)
    res.json({ success: true })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message })
  }
}

export async function webhookStripe(req, res) {
  try {
    const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body)
    const event = JSON.parse(raw)
    const tid = event?.data?.object?.metadata?.tenantId || req.query.tenantId
    if (tid) {
      const doc = await Creds().findOne({ id: credId(tid, 'stripe') }).lean()
      if (doc) {
        const { verifyWebhook } = await import('../integrations/adapters/stripe.js')
        verifyWebhook(decryptFields(doc), raw, req.get('Stripe-Signature'))
      }
      await markPaid(tid, event?.data?.object?.metadata?.plan)
    }
    res.json({ success: true })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message })
  }
}
