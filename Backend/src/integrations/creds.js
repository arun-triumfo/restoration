import { getResourceModel } from '../models/createResourceModel.js'
import { decryptSecret, encryptSecret, maskSecret } from '../utils/secrets.js'
import { CATALOG } from './catalog.js'

export function Creds() {
  return getResourceModel('integration_credentials', 'id', true)
}

export function credId(tenantId, channel) {
  return `${tenantId}__${channel}`
}

export function decryptFields(doc) {
  const out = {}
  if (doc?.fieldsEnc && typeof doc.fieldsEnc === 'object') {
    for (const [k, v] of Object.entries(doc.fieldsEnc)) {
      if (v) out[k] = decryptSecret(v)
    }
  }
  // Legacy rows (single secretEnc + shopDomain)
  if (doc?.secretEnc && !out.accessToken && !out.password && !out.keySecret && !out.apiKey) {
    const secret = decryptSecret(doc.secretEnc)
    out.accessToken = secret
    out.password = secret
    out.apiKey = secret
    out.keySecret = secret
    out.refreshToken = secret
    out.clientSecret = secret
    out.apiSecret = secret
    out.secretKey = secret
  }
  if (doc?.shopDomain) {
    out.shopDomain = out.shopDomain || doc.shopDomain
    out.email = out.email || doc.shopDomain
    out.username = out.username || doc.shopDomain
    out.sellerId = out.sellerId || doc.shopDomain
  }
  const acc = doc?.meta?.accountNumber
  if (acc && !out.accountNumber) out.accountNumber = acc
  return out
}

export function mergeEncryptedFields(existingEnc = {}, incoming = {}, catalog) {
  const fieldsEnc = { ...(existingEnc || {}) }
  const fieldHints = {}
  for (const f of catalog.fields) {
    const raw = incoming[f.key]
    if (raw != null && String(raw).trim() !== '') {
      const val = String(raw).trim()
      fieldsEnc[f.key] = encryptSecret(val)
    }
    if (fieldsEnc[f.key]) {
      fieldHints[f.key] = f.secret ? maskSecret(decryptSecret(fieldsEnc[f.key])) : decryptSecret(fieldsEnc[f.key])
    }
  }
  return { fieldsEnc, fieldHints }
}

export function missingRequired(fields, catalog) {
  return catalog.fields.filter((f) => f.required && !String(fields[f.key] || '').trim()).map((f) => f.label)
}

export function publicConnection(doc, channel) {
  const cat = CATALOG[channel]
  const hints = doc?.fieldHints || {}
  const filled = {}
  for (const f of cat?.fields || []) {
    filled[f.key] = {
      filled: Boolean(hints[f.key] || doc?.fieldsEnc?.[f.key] || (f.key === 'shopDomain' && doc?.shopDomain)),
      hint: hints[f.key] || null,
    }
  }
  return {
    id: doc?.id || null,
    channel,
    status: doc?.status || 'disconnected',
    mode: doc?.meta?.mode || doc?.mode || 'sandbox',
    lastSyncAt: doc?.lastSyncAt || null,
    lastError: doc?.lastError || null,
    lastVerifiedAt: doc?.meta?.lastVerifiedAt || null,
    shopDomain: doc?.shopDomain || null,
    hasSecret: Boolean(doc?.secretEnc || Object.keys(doc?.fieldsEnc || {}).length),
    secretHint: doc?.secretHint || null,
    fields: filled,
    meta: doc?.meta || {},
  }
}

export async function loadLive(tenantId, channel) {
  const doc = await Creds().findOne({ id: credId(tenantId, channel), tenantId }).lean()
  if (!doc || doc.status !== 'connected') return null
  const mode = doc.meta?.mode || doc.mode || 'sandbox'
  if (mode !== 'live') return null
  return { doc, fields: decryptFields(doc), mode }
}
