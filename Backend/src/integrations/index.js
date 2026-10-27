import * as amazon from './adapters/amazon.js'
import * as aramex from './adapters/aramex.js'
import * as dhl from './adapters/dhl.js'
import * as etsy from './adapters/etsy.js'
import * as fedex from './adapters/fedex.js'
import * as razorpay from './adapters/razorpay.js'
import * as shipglobal from './adapters/shipglobal.js'
import * as shiprocket from './adapters/shiprocket.js'
import * as shopify from './adapters/shopify.js'
import * as stripe from './adapters/stripe.js'
import { CATALOG } from './catalog.js'
import { mapOrder, matchCatalogSku } from './orderMap.js'

export const ADAPTERS = {
  shopify,
  amazon,
  etsy,
  shiprocket,
  aramex,
  shipglobal,
  fedex,
  dhl,
  razorpay,
  stripe,
}

const COURIER_CODE = {
  shiprocket: 'SHIPROCKET',
  aramex: 'ARAMEX',
  shipglobal: 'SHIPGLOBAL',
  fedex: 'FEDEX',
  dhl: 'DHL',
}

export function channelFromCarrier(code) {
  const map = {
    SHIPROCKET: 'shiprocket',
    ARAMEX: 'aramex',
    SHIPGLOBAL: 'shipglobal',
    FEDEX: 'fedex',
    DHL: 'dhl',
  }
  return map[String(code || '').toUpperCase()] || null
}

export async function runTest(channel, fields, mode) {
  if (mode !== 'live') {
    return {
      ok: true,
      message: `${CATALOG[channel]?.label || channel} saved in sandbox mode. Switch to Live and save real keys to ping the real API.`,
    }
  }
  const a = ADAPTERS[channel]
  if (!a?.test) throw new Error(`No live test adapter for ${channel}`)
  return a.test(fields)
}

export async function runSync(channel, fields, mode, ctx) {
  if (mode === 'live') {
    const a = ADAPTERS[channel]
    if (!a?.sync) throw new Error(`${channel} is not a marketplace`)
    return a.sync(fields, ctx)
  }
  return sandboxSync(channel, ctx)
}

export async function sandboxSync(channel, { tenantId, catalog = [] }) {
  const stamp = Date.now().toString().slice(-6)
  const labels = { shopify: 'Shopify', amazon: 'Amazon', etsy: 'Etsy' }
  const channelLabel = labels[channel] || channel
  const pick = (i) => (catalog.length ? catalog[(Number(stamp) + i) % catalog.length] : null)
  const imported = [0, 1].map((i) => {
    const sku = pick(i)
    const qty = i + 1
    const unit = Number(sku?.sellingPriceUSD) || 149
    return mapOrder({
      orderId: `${channelLabel.slice(0, 3).toUpperCase()}-${stamp}-${i + 1}`,
      channel: channelLabel,
      buyerName: i === 0 ? (channel === 'amazon' ? 'Amazon Customer' : 'Web Customer') : 'Repeat Buyer',
      sku: sku?.sku || `DEMO-RUG-00${i + 1}`,
      title: sku?.title,
      imageUrl: sku?.imageUrl,
      qty,
      total: Math.round(unit * qty * 100) / 100,
      extra: { tenantId, source: `${channel}_sandbox`, marketplaceId: `${channel}_${stamp}_${i + 1}` },
    })
  })
  void matchCatalogSku
  return { imported, message: `${channelLabel} sandbox: ${imported.length} sample orders (switch to Live after keys)` }
}

export function liveCourierAdapter(channel, fields) {
  const a = ADAPTERS[channel]
  if (!a?.getRates) return null
  const code = COURIER_CODE[channel]
  return {
    code,
    label: `${CATALOG[channel].label} (live)`,
    getRates: (opts) => a.getRates(fields, opts),
    buyLabel: (opts) => a.buyLabel(fields, opts),
    track: (awb) => a.track(fields, awb),
  }
}
