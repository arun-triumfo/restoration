/**
 * Scenario D — Returns land in India WH bucket.
 * Platform return labels (Amazon/Shopify/…) + PDF + product detail for Accounts P&L.
 */
import { DEFAULT_TENANT_ID } from '../constants/tenant.js'
import { getResourceModel } from '../models/createResourceModel.js'
import { pushHistory } from '../services/orderFulfillment.js'
import { buyPlatformReturnLabel } from '../services/platformLabels.js'

function tenantIdOf(req) {
  return req.user?.tenantId || DEFAULT_TENANT_ID
}

function Returns() {
  return getResourceModel('returns', 'returnId', true)
}

function Orders() {
  return getResourceModel('orders', 'orderId', true)
}

function Monthly() {
  return getResourceModel('monthly_financials', 'period', true)
}

function tenantFilter(tid) {
  if (tid === DEFAULT_TENANT_ID) {
    return {
      $or: [{ tenantId: tid }, { tenantId: { $exists: false } }, { tenantId: null }],
    }
  }
  return { tenantId: tid }
}

/** POST /api/returns/actions/buy-return-label  body: { returnId } */
export async function buyReturnLabel(req, res) {
  try {
    const tid = tenantIdOf(req)
    const role = req.user?.roleCode
    if (!['super_admin', 'india_wh', 'finance'].includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'Only India Warehouse Manager can generate return labels',
      })
    }

    const returnId = String(req.body?.returnId || '').trim()
    if (!returnId) return res.status(400).json({ success: false, message: 'returnId required' })

    const ret = await Returns()
      .findOne({ $and: [tenantFilter(tid), { returnId }] })
      .lean()
    if (!ret) return res.status(404).json({ success: false, message: 'Return not found' })

    let order = null
    if (ret.orderId) {
      order = await Orders()
        .findOne({ $and: [tenantFilter(tid), { orderId: String(ret.orderId) }] })
        .lean()
    }

    const label = await buyPlatformReturnLabel(ret, order, tid)
    const history = pushHistory(
      ret,
      'Return label generated',
      `${label.source} return label ${label.awb}. PDF ready to send to customer. Cost $${label.amount} for Accounts.`,
    )

    const profitImpactUSD = -Math.abs(Number(label.amount) || 0)

    const data = await Returns()
      .findOneAndUpdate(
        { $and: [tenantFilter(tid), { returnId }] },
        {
          $set: {
            queueOwner: 'india_wh',
            returnAwb: label.awb,
            returnLabelPdfUrl: label.labelPdfUrl,
            returnLabelSource: label.source,
            returnPlatform: label.platform,
            returnLabelCost: label.amount,
            returnLabelCurrency: label.currency,
            returnTrackingUrl: label.trackingUrl,
            productDetail: label.productDetail,
            sku: ret.sku || order?.sku || null,
            qty: ret.qty || order?.qty || 1,
            status: 'Return Label Sent',
            profitImpactUSD,
            accountsTagged: true,
            history,
          },
        },
        { new: true },
      )
      .lean()

    // Roll a simple hit into current-month profitability for Accounts
    try {
      const period = new Date().toISOString().slice(0, 7)
      const existing = await Monthly().findOne({ period, tenantId: tid }).lean()
      const shippingOut = Number(existing?.shippingOutflowsUSD || 0) + Number(label.amount)
      const returnsCost = Number(existing?.returnsCostUSD || 0) + Number(label.amount)
      await Monthly().findOneAndUpdate(
        { period, tenantId: tid },
        {
          $set: {
            period,
            periodShort: period,
            tenantId: tid,
            shippingOutflowsUSD: shippingOut,
            returnsCostUSD: returnsCost,
            updatedFrom: 'return_label',
          },
        },
        { upsert: true },
      )
    } catch {
      /* non-fatal */
    }

    res.json({
      success: true,
      data,
      label: {
        awb: label.awb,
        labelPdfUrl: label.labelPdfUrl,
        source: label.source,
        amount: label.amount,
        mode: label.mode,
      },
      message: `Return label PDF created via ${label.source}. Send to customer. Cost logged for Accounts.`,
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
