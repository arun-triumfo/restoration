/**
 * US sales-channel shipping / return labels.
 * Amazon / Shopify / other platforms — sandbox label when live buy-shipping keys are absent.
 * Cheapest US domestic labels typically come from the selling platform.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { loadLive } from '../integrations/creds.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LABELS_DIR = path.resolve(__dirname, '../../uploads/labels')

export function detectPlatform(channel) {
  const c = String(channel || '').toLowerCase()
  if (c.includes('amazon')) return 'amazon'
  if (c.includes('shopify')) return 'shopify'
  if (c.includes('etsy')) return 'etsy'
  if (c.includes('walmart')) return 'walmart'
  if (c.includes('wayfair')) return 'wayfair'
  return 'other'
}

export function platformLabelSource(platform) {
  const map = {
    amazon: 'Amazon Buy Shipping',
    shopify: 'Shopify Shipping',
    etsy: 'Etsy Shipping Labels',
    walmart: 'Walmart Shipping',
    wayfair: 'Wayfair Shipping',
    other: 'Platform / marketplace shipping',
  }
  return map[platform] || map.other
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function makeAwb(platform, orderId) {
  const prefix = {
    amazon: 'AMZ',
    shopify: 'SHP',
    etsy: 'ETY',
    walmart: 'WMT',
    wayfair: 'WYF',
    other: 'PLT',
  }[platform] || 'PLT'
  const tail = String(orderId || 'ORD')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(-8)
    .toUpperCase()
  return `${prefix}-${tail}-${Date.now().toString(36).toUpperCase()}`
}

function writeLabelHtml({
  title,
  awb,
  platform,
  source,
  order,
  shipFrom,
  shipTo,
  amount,
  isReturn,
}) {
  ensureDir(LABELS_DIR)
  const fileName = `${awb}.html`
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${title}</title>
<style>
  body{font-family:system-ui,sans-serif;padding:24px;color:#111}
  h1{font-size:20px;margin:0 0 8px}
  .box{border:2px solid #111;padding:16px;border-radius:8px;margin:12px 0}
  .meta{font-size:13px;line-height:1.5}
  .awb{font-size:28px;font-weight:800;letter-spacing:0.04em}
  .tag{display:inline-block;background:#111;color:#fff;padding:4px 10px;border-radius:4px;font-size:11px;font-weight:700}
</style></head><body>
  <span class="tag">${isReturn ? 'RETURN LABEL' : 'SHIPPING LABEL'} · ${source}</span>
  <h1>${title}</h1>
  <p class="awb">${awb}</p>
  <div class="box meta">
    <p><strong>Platform:</strong> ${platform} (${source})</p>
    <p><strong>Order:</strong> ${order?.orderId || '—'} · <strong>Channel:</strong> ${order?.channel || '—'}</p>
    <p><strong>SKU:</strong> ${order?.sku || '—'} × ${order?.qty || 1}</p>
    <p><strong>Buyer:</strong> ${order?.buyerName || '—'}</p>
    <p><strong>Quoted / bill:</strong> $${Number(amount || 0).toFixed(2)} USD</p>
  </div>
  <div class="box meta">
    <p><strong>FROM</strong><br/>${shipFrom}</p>
  </div>
  <div class="box meta">
    <p><strong>TO</strong><br/>${shipTo}</p>
  </div>
  <p class="meta">Sandbox / platform label PDF stand-in. Connect ${platform} API keys on Integrations for live buy-shipping.</p>
</body></html>`
  fs.writeFileSync(path.join(LABELS_DIR, fileName), html, 'utf8')
  return `/uploads/labels/${fileName}`
}

/**
 * Buy outbound customer label via sales channel (Scenario A — India generates, PDF to US).
 */
export async function buyPlatformOutboundLabel(order, tenantId) {
  const platform = detectPlatform(order.channel)
  const source = platformLabelSource(platform)
  let mode = 'sandbox'
  let amount = 8.5
  try {
    const live = await loadLive(tenantId, platform === 'other' ? null : platform)
    if (live) {
      mode = 'live_keys_present'
      // Live Buy Shipping APIs differ by seller account; keys unlock ready mode.
      amount = 7.25
    }
  } catch {
    /* keep sandbox */
  }

  const awb = makeAwb(platform, order.orderId)
  const shipFrom = 'US Warehouse, Edison, NJ 08817, USA'
  const shipTo = `${order.buyerName || 'Customer'}\n${order.shippingAddress || 'Address on file'}`
  const labelPdfUrl = writeLabelHtml({
    title: `${source} — Customer Label`,
    awb,
    platform,
    source,
    order,
    shipFrom,
    shipTo,
    amount,
    isReturn: false,
  })

  return {
    awb,
    platform,
    source,
    mode,
    amount,
    currency: 'USD',
    labelPdfUrl,
    trackingUrl: `https://track.example/${awb}`,
    status: 'Label Created',
    carrier: source,
  }
}

/**
 * Buy return label via sales channel (Scenario D — India bucket).
 */
export async function buyPlatformReturnLabel(ret, order, tenantId) {
  const channel = order?.channel || ret.channel || ret.platform || ''
  const platform = detectPlatform(channel)
  const source = platformLabelSource(platform)
  let mode = 'sandbox'
  let amount = 9.5
  try {
    const live = await loadLive(tenantId, platform === 'other' ? null : platform)
    if (live) {
      mode = 'live_keys_present'
      amount = 8.1
    }
  } catch {
    /* sandbox */
  }

  const awb = `RMA-${makeAwb(platform, ret.returnId || ret.orderId)}`
  const shipFrom = `${ret.customer || order?.buyerName || 'Customer'}\n${ret.customerAddress || order?.shippingAddress || 'Customer address'}`
  const shipTo = 'India Warehouse — Returns desk (Bhadohi / Mirzapur region)'
  const productLine = `SKU ${ret.sku || order?.sku || '—'} · ${ret.productTitle || order?.sku || 'Product'} × ${ret.qty || order?.qty || 1}`
  const labelPdfUrl = writeLabelHtml({
    title: `${source} — Return Label`,
    awb,
    platform,
    source,
    order: {
      orderId: ret.orderId || order?.orderId,
      channel: channel || platform,
      sku: ret.sku || order?.sku,
      qty: ret.qty || order?.qty || 1,
      buyerName: ret.customer || order?.buyerName,
    },
    shipFrom: `${shipFrom}\n${productLine}`,
    shipTo,
    amount,
    isReturn: true,
  })

  return {
    awb,
    platform,
    source,
    mode,
    amount,
    currency: 'USD',
    labelPdfUrl,
    trackingUrl: `https://track.example/${awb}`,
    status: 'Return Label Created',
    carrier: source,
    productDetail: productLine,
  }
}
