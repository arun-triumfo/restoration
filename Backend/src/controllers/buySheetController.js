import { DEFAULT_TENANT_ID } from '../constants/tenant.js'
import { getResourceModel } from '../models/createResourceModel.js'

function tenantIdOf(req) {
  return req.user?.tenantId || DEFAULT_TENANT_ID
}

function POs() {
  return getResourceModel('purchase_orders', 'poNumber', true)
}

function Logs() {
  return getResourceModel('system_logs', 'id', true)
}

/**
 * POST body: { lines: [{ sku, qty, title? }], vendor?, notes? }
 * Creates one Draft PO with line items.
 */
export async function fromBuySheet(req, res) {
  try {
    const tid = tenantIdOf(req)
    const lines = Array.isArray(req.body?.lines) ? req.body.lines : []
    const cleaned = lines
      .map((l) => ({
        sku: String(l.sku || '').trim(),
        qty: Math.max(1, Number(l.qty) || 1),
        title: l.title || l.sku,
      }))
      .filter((l) => l.sku)

    if (!cleaned.length) {
      return res.status(400).json({ success: false, message: 'lines[] with sku required' })
    }

    const poNumber = `PO-BUY-${Date.now().toString().slice(-8)}`
    const doc = {
      poNumber,
      status: 'Draft',
      source: 'buy_sheet',
      vendor: req.body?.vendor || 'India Mill / Weavers',
      notes: req.body?.notes || 'Created from Demand Forecast buy sheet',
      lines: cleaned,
      lineCount: cleaned.length,
      totalQty: cleaned.reduce((s, l) => s + l.qty, 0),
      createdBy: req.user?.email,
      tenantId: tid,
      orderedAt: new Date().toISOString(),
    }

    await POs().create(doc)

    try {
      await Logs().create({
        id: `log-${Date.now()}-buysheet`,
        action: 'PO_FROM_BUY_SHEET',
        detail: `${poNumber} · ${cleaned.length} lines`,
        user: req.user?.email,
        tenantId: tid,
        at: new Date().toISOString(),
      })
    } catch {
      /* ignore */
    }

    res.status(201).json({
      success: true,
      data: doc,
      message: `Draft PO ${poNumber} created`,
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
