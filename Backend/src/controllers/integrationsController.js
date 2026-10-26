import { getResourceModel } from '../models/createResourceModel.js'
import { DEFAULT_TENANT_ID } from '../constants/tenant.js'
import { decryptSecret, encryptSecret, maskSecret } from '../utils/secrets.js'

const CHANNELS = ['shopify', 'amazon', 'etsy']

function Creds() {
  return getResourceModel('integration_credentials', 'id', true)
}
function Orders() {
  return getResourceModel('orders', 'orderId', true)
}
function Workers() {
  return getResourceModel('integration_workers', 'id', true)
}
function Failed() {
  return getResourceModel('failed_jobs', 'jobId', true)
}

function tenantIdOf(req) {
  return req.user?.tenantId || DEFAULT_TENANT_ID
}

function credId(tenantId, channel) {
  return `${tenantId}__${channel}`
}

function publicCred(doc) {
  if (!doc) return null
  return {
    id: doc.id,
    channel: doc.channel,
    status: doc.status || 'disconnected',
    shopDomain: doc.shopDomain || null,
    lastSyncAt: doc.lastSyncAt || null,
    lastError: doc.lastError || null,
    hasSecret: Boolean(doc.secretEnc),
    secretHint: doc.secretHint || null,
    meta: doc.meta || {},
  }
}

export async function listConnections(req, res) {
  try {
    const tid = tenantIdOf(req)
    const rows = await Creds()
      .find({ tenantId: tid })
      .lean()
    const byChannel = Object.fromEntries(rows.map((r) => [r.channel, publicCred(r)]))
    const data = CHANNELS.map((ch) => byChannel[ch] || {
      id: credId(tid, ch),
      channel: ch,
      status: 'disconnected',
      shopDomain: null,
      lastSyncAt: null,
      lastError: null,
      hasSecret: false,
      secretHint: null,
      meta: {},
    })
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function connectChannel(req, res) {
  try {
    const channel = String(req.params.channel || '').toLowerCase()
    if (!CHANNELS.includes(channel)) {
      return res.status(400).json({ success: false, message: `channel must be one of ${CHANNELS.join(', ')}` })
    }
    const tid = tenantIdOf(req)
    const apiKey = String(req.body?.apiKey || req.body?.accessToken || '').trim()
    const shopDomain = String(req.body?.shopDomain || req.body?.sellerId || '').trim()
    if (!apiKey) {
      return res.status(400).json({ success: false, message: 'apiKey / accessToken required' })
    }

    const id = credId(tid, channel)
    const doc = await Creds().findOneAndUpdate(
      { id },
      {
        $set: {
          id,
          channel,
          tenantId: tid,
          shopDomain: shopDomain || null,
          secretEnc: encryptSecret(apiKey),
          secretHint: maskSecret(apiKey),
          status: 'connected',
          lastError: null,
          meta: {
            mode: req.body?.mode === 'live' ? 'live' : 'sandbox',
            connectedAt: new Date().toISOString(),
          },
        },
      },
      { upsert: true, new: true },
    ).lean()

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

    res.json({ success: true, connection: publicCred(doc), message: `${channel} connected (credentials encrypted)` })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function disconnectChannel(req, res) {
  try {
    const channel = String(req.params.channel || '').toLowerCase()
    const tid = tenantIdOf(req)
    const id = credId(tid, channel)
    await Creds().findOneAndUpdate(
      { id, tenantId: tid },
      { $set: { status: 'disconnected', secretEnc: '', lastError: null } },
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
    if (!doc || doc.status !== 'connected' || !doc.secretEnc) {
      return res.status(400).json({ success: false, message: 'Connect credentials first' })
    }
    const secret = decryptSecret(doc.secretEnc)
    // Sandbox: prove decrypt works; live APIs land in later tickets
    const ok = Boolean(secret)
    res.json({
      success: ok,
      channel,
      mode: doc.meta?.mode || 'sandbox',
      message: ok
        ? `${channel} credentials decrypt OK (${doc.meta?.mode || 'sandbox'}). Live API ping comes with OAuth tickets.`
        : 'Decrypt failed',
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

/** Pull mock / normalized orders into tenant Orders collection */
export async function syncChannel(req, res) {
  const channel = String(req.params.channel || '').toLowerCase()
  const tid = tenantIdOf(req)
  const jobId = `job-${channel}-${Date.now()}`
  try {
    if (!CHANNELS.includes(channel)) {
      return res.status(400).json({ success: false, message: 'Unknown channel' })
    }
    const cred = await Creds().findOne({ id: credId(tid, channel), tenantId: tid }).lean()
    if (!cred || cred.status !== 'connected') {
      return res.status(400).json({ success: false, message: 'Connect channel before sync' })
    }

    await Workers().findOneAndUpdate(
      { id: `worker-${channel}-${tid}` },
      { $set: { status: 'Running', lastHeartbeat: new Date().toISOString() } },
      { upsert: true },
    )

    const created = []
    if (channel === 'shopify' || channel === 'amazon' || channel === 'etsy') {
      const stamp = Date.now().toString().slice(-6)
      const samples = [
        {
          orderId: `${channel.toUpperCase().slice(0, 3)}-${stamp}-1`,
          channel: channel === 'shopify' ? 'Shopify' : channel === 'amazon' ? 'Amazon' : 'Etsy',
          buyerName: channel === 'amazon' ? 'Amazon Customer' : 'Web Customer',
          status: 'Pending Allocation',
          sku: 'DEMO-RUG-001',
          qty: 1,
          amount: channel === 'amazon' ? 189 : 149,
          currency: 'USD',
          marketplaceId: `${channel}_${stamp}_1`,
          source: `${channel}_sync`,
          tenantId: tid,
        },
        {
          orderId: `${channel.toUpperCase().slice(0, 3)}-${stamp}-2`,
          channel: channel === 'shopify' ? 'Shopify' : channel === 'amazon' ? 'Amazon' : 'Etsy',
          buyerName: 'Repeat Buyer',
          status: 'Pending Allocation',
          sku: 'DEMO-RUG-002',
          qty: 2,
          amount: 298,
          currency: 'USD',
          marketplaceId: `${channel}_${stamp}_2`,
          source: `${channel}_sync`,
          tenantId: tid,
        },
      ]

      for (const row of samples) {
        await Orders().findOneAndUpdate(
          { orderId: row.orderId, tenantId: tid },
          { $set: row },
          { upsert: true },
        )
        created.push(row.orderId)
      }
    }

    const now = new Date().toISOString()
    await Creds().findOneAndUpdate(
      { id: credId(tid, channel) },
      { $set: { lastSyncAt: now, lastError: null } },
    )
    await Workers().findOneAndUpdate(
      { id: `worker-${channel}-${tid}` },
      { $set: { status: 'Idle', lastHeartbeat: now, lastSyncAt: now, lastResult: `imported ${created.length}` } },
    )

    res.json({
      success: true,
      channel,
      imported: created.length,
      orderIds: created,
      message:
        channel === 'shopify'
          ? 'Shopify sandbox sync: sample orders upserted (replace with Admin API ingest next).'
          : channel === 'amazon'
            ? 'Amazon SP-API phase-1 sandbox: sample orders upserted.'
            : 'Etsy sandbox sync complete.',
    })
  } catch (err) {
    await Failed().create({
      jobId,
      channel,
      tenantId: tid,
      error: err.message,
      status: 'failed',
      createdAt: new Date().toISOString(),
    }).catch(() => {})
    await Creds().findOneAndUpdate(
      { id: credId(tid, channel) },
      { $set: { lastError: err.message, status: 'error' } },
    ).catch(() => {})
    res.status(500).json({ success: false, message: err.message, jobId })
  }
}
