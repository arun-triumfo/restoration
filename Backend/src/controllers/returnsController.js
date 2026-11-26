/**
 * Returns: India opens → platform return label → US bucket receive.
 * P&L = -refund - labelCost + restockValue (if restockable).
 */
import { DEFAULT_TENANT_ID } from '../constants/tenant.js'
import { getResourceModel } from '../models/createResourceModel.js'
import { pushHistory } from '../services/orderFulfillment.js'
import { buyPlatformReturnLabel, detectPlatform, platformLabelSource } from '../services/platformLabels.js'

function tenantIdOf(req) {
  return req.user?.tenantId || DEFAULT_TENANT_ID
}

function Returns() {
  return getResourceModel('returns', 'returnId', true)
}

function Orders() {
  return getResourceModel('orders', 'orderId', true)
}

function Skus() {
  return getResourceModel('skus', 'sku', true)
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

function calcReturnPnL({ refundUSD, labelCostUSD, mfgCostUSD, restockable }) {
  const refund = Math.abs(Number(refundUSD) || 0)
  const labelCost = Math.abs(Number(labelCostUSD) || 0)
  const mfg = Math.abs(Number(mfgCostUSD) || 0)
  const restockValue = restockable ? mfg : 0
  // Net P&L impact (negative = loss): refund paid out + label spend − inventory value recovered
  const profitImpactUSD = Math.round((-refund - labelCost + restockValue) * 100) / 100
  return {
    refundUSD: refund,
    labelCostUSD: labelCost,
    mfgCostUSD: mfg,
    restockValueUSD: restockValue,
    profitImpactUSD,
    pnlBreakdown: `Refund -$${refund.toFixed(2)} − Label -$${labelCost.toFixed(2)} + Restock +$${restockValue.toFixed(2)} = ${profitImpactUSD.toFixed(2)}`,
  }
}

async function rollMonthlyPnL(tid, { labelCost, refund, profitImpact }) {
  const period = new Date().toISOString().slice(0, 7)
  const existing = await Monthly().findOne({ period, tenantId: tid }).lean()
  await Monthly().findOneAndUpdate(
    { period, tenantId: tid },
    {
      $set: {
        period,
        periodShort: period,
        tenantId: tid,
        shippingOutflowsUSD: Number(existing?.shippingOutflowsUSD || 0) + Number(labelCost || 0),
        returnsCostUSD: Number(existing?.returnsCostUSD || 0) + Number(refund || 0) + Number(labelCost || 0),
        returnsRefundUSD: Number(existing?.returnsRefundUSD || 0) + Number(refund || 0),
        returnsPnLUSD: Number(existing?.returnsPnLUSD || 0) + Number(profitImpact || 0),
        updatedFrom: 'return_flow',
      },
    },
    { upsert: true },
  )
}

/** POST /api/returns/actions/buy-return-label */
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

    const channel = ret.channel || ret.platform || order?.channel || ''
    const platform = detectPlatform(channel)
    const source = platformLabelSource(platform)

    let skuDoc = null
    const skuCode = ret.sku || order?.sku
    if (skuCode) {
      skuDoc = await Skus()
        .findOne({ $and: [tenantFilter(tid), { sku: String(skuCode) }] })
        .lean()
    }

    const qty = Math.max(1, Number(ret.qty || order?.qty || 1))
    const refundUSD =
      Number(ret.refundUSD) ||
      Number(order?.totalOrderUSD) ||
      Number(order?.unitPriceUSD || skuDoc?.sellingPriceUSD || 0) * qty
    const mfgCostUSD = Number(skuDoc?.mfgCostUSD || ret.mfgCostUSD || 0) * qty
    const restockable = String(ret.condition || req.body?.condition || 'Good').toLowerCase() !== 'damaged'

    const label = await buyPlatformReturnLabel(
      { ...ret, channel, platform, sku: skuCode, qty },
      order,
      tid,
    )

    const pnl = calcReturnPnL({
      refundUSD,
      labelCostUSD: label.amount,
      mfgCostUSD,
      restockable,
    })

    const history = pushHistory(
      ret,
      'Return label → US bucket',
      `${source} (${platform}) label ${label.awb}. PDF for customer. Moved to US Warehouse for receive. ${pnl.pnlBreakdown}`,
    )

    const data = await Returns()
      .findOneAndUpdate(
        { $and: [tenantFilter(tid), { returnId }] },
        {
          $set: {
            queueOwner: 'usa_wh',
            channel: channel || source,
            platform,
            returnPlatform: platform,
            returnLabelSource: source,
            returnAwb: label.awb,
            returnLabelPdfUrl: label.labelPdfUrl,
            returnLabelCost: label.amount,
            returnLabelCurrency: label.currency,
            returnTrackingUrl: label.trackingUrl,
            productDetail: label.productDetail,
            sku: skuCode || null,
            qty,
            refundUSD: pnl.refundUSD,
            mfgCostUSD: pnl.mfgCostUSD,
            restockValueUSD: pnl.restockValueUSD,
            labelCostUSD: pnl.labelCostUSD,
            profitImpactUSD: pnl.profitImpactUSD,
            pnlBreakdown: pnl.pnlBreakdown,
            condition: ret.condition || req.body?.condition || 'Good',
            status: 'Awaiting US Receive',
            accountsTagged: true,
            labelSentAt: new Date().toISOString(),
            history,
          },
        },
        { new: true },
      )
      .lean()

    try {
      await rollMonthlyPnL(tid, {
        labelCost: pnl.labelCostUSD,
        refund: pnl.refundUSD,
        profitImpact: pnl.profitImpactUSD,
      })
    } catch {
      /* non-fatal */
    }

    res.json({
      success: true,
      data,
      label: {
        awb: label.awb,
        labelPdfUrl: label.labelPdfUrl,
        source,
        platform,
        amount: label.amount,
        mode: label.mode,
      },
      pnl,
      message: `Return label via ${source}. Sent to US bucket (Awaiting US Receive). P&L: ${pnl.profitImpactUSD}`,
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

/** POST /api/returns/actions/us-receive  body: { returnId, restock?: boolean, condition? } */
export async function usReceiveReturn(req, res) {
  try {
    const tid = tenantIdOf(req)
    const role = req.user?.roleCode
    if (!['super_admin', 'usa_wh'].includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'Only US Warehouse Manager can receive returns',
      })
    }
    const returnId = String(req.body?.returnId || '').trim()
    if (!returnId) return res.status(400).json({ success: false, message: 'returnId required' })

    const ret = await Returns()
      .findOne({ $and: [tenantFilter(tid), { returnId }] })
      .lean()
    if (!ret) return res.status(404).json({ success: false, message: 'Return not found' })

    const restock = req.body?.restock !== false
    const condition = req.body?.condition || ret.condition || 'Good'
    const restockable = restock && String(condition).toLowerCase() !== 'damaged'

    const pnl = calcReturnPnL({
      refundUSD: ret.refundUSD,
      labelCostUSD: ret.returnLabelCost || ret.labelCostUSD,
      mfgCostUSD: ret.mfgCostUSD,
      restockable,
    })

    // Restock into US available if SKU known
    if (restockable && ret.sku) {
      try {
        const Sku = Skus()
        const skuDoc = await Sku.findOne({ $and: [tenantFilter(tid), { sku: String(ret.sku) }] })
        if (skuDoc) {
          const stock = skuDoc.stock || {}
          const usa = Number(stock.usaAvailable || skuDoc.usaAvailable || 0) + Number(ret.qty || 1)
          await Sku.findOneAndUpdate(
            { $and: [tenantFilter(tid), { sku: String(ret.sku) }] },
            {
              $set: {
                'stock.usaAvailable': usa,
                usaAvailable: usa,
              },
            },
          )
        }
      } catch {
        /* non-fatal */
      }
    }

    const history = pushHistory(
      ret,
      'US received return',
      `Received at US Warehouse. Condition: ${condition}. ${restockable ? 'Restocked to US inventory.' : 'Not restocked.'} ${pnl.pnlBreakdown}`,
    )

    const data = await Returns()
      .findOneAndUpdate(
        { $and: [tenantFilter(tid), { returnId }] },
        {
          $set: {
            queueOwner: 'usa_wh',
            status: restockable ? 'Restocked' : 'Received — No Restock',
            condition,
            restocked: restockable,
            receivedAt: new Date().toISOString(),
            restockValueUSD: pnl.restockValueUSD,
            profitImpactUSD: pnl.profitImpactUSD,
            pnlBreakdown: pnl.pnlBreakdown,
            history,
          },
        },
        { new: true },
      )
      .lean()

    res.json({
      success: true,
      data,
      pnl,
      message: restockable
        ? 'Return received and restocked at US Warehouse'
        : 'Return received — not restocked (damaged / hold)',
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

const INSPECTION = ['Restockable', 'Repair', 'Damaged', 'Write-off']

/** POST /api/returns/actions/inspect */
export async function inspectReturn(req, res) {
  try {
    const tid = tenantIdOf(req)
    const role = req.user?.roleCode
    if (!['super_admin', 'usa_wh', 'india_wh', 'finance'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Not allowed to inspect' })
    }
    const returnId = String(req.body?.returnId || '').trim()
    const condition = String(req.body?.condition || '').trim()
    if (!returnId) return res.status(400).json({ success: false, message: 'returnId required' })
    if (!INSPECTION.includes(condition) && !condition) {
      return res.status(400).json({
        success: false,
        message: `condition required: ${INSPECTION.join(' | ')}`,
      })
    }

    const ret = await Returns()
      .findOne({ $and: [tenantFilter(tid), { returnId }] })
      .lean()
    if (!ret) return res.status(404).json({ success: false, message: 'Return not found' })

    const restockable = condition === 'Restockable'
    const pnl = calcReturnPnL({
      refundUSD: ret.refundUSD,
      labelCostUSD: ret.returnLabelCost || ret.labelCostUSD,
      mfgCostUSD: ret.mfgCostUSD,
      restockable,
    })
    const photos = Array.isArray(req.body?.photos)
      ? req.body.photos
      : Array.isArray(ret.photos)
        ? ret.photos
        : []
    if (req.body?.photoDataUrl) {
      photos.push({
        id: `ph-${Date.now()}`,
        url: String(req.body.photoDataUrl),
        at: new Date().toISOString(),
        by: req.user?.email || '',
        note: req.body?.photoNote || condition,
      })
    }

    const history = pushHistory(
      ret,
      'Inspection',
      `${condition}. ${req.body?.notes || ''} ${pnl.pnlBreakdown}`.trim(),
    )

    const data = await Returns()
      .findOneAndUpdate(
        { $and: [tenantFilter(tid), { returnId }] },
        {
          $set: {
            condition,
            inspectionResult: condition,
            inspectedAt: new Date().toISOString(),
            inspectedBy: req.user?.email || '',
            status: condition === 'Write-off' ? 'Write-off' : `Inspected — ${condition}`,
            restockValueUSD: pnl.restockValueUSD,
            profitImpactUSD: pnl.profitImpactUSD,
            pnlBreakdown: pnl.pnlBreakdown,
            photos,
            repairCostUSD: Number(req.body?.repairCostUSD || ret.repairCostUSD || 0),
            history,
          },
        },
        { new: true },
      )
      .lean()

    res.json({ success: true, data, pnl, message: `Inspected: ${condition}` })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

/** POST /api/returns/actions/mark-refunded — once only */
export async function markRefunded(req, res) {
  try {
    const tid = tenantIdOf(req)
    const role = req.user?.roleCode
    if (!['super_admin', 'finance', 'india_wh'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Finance / India WH only' })
    }
    const returnId = String(req.body?.returnId || '').trim()
    if (!returnId) return res.status(400).json({ success: false, message: 'returnId required' })

    const ret = await Returns()
      .findOne({ $and: [tenantFilter(tid), { returnId }] })
      .lean()
    if (!ret) return res.status(404).json({ success: false, message: 'Return not found' })
    if (ret.refundPosted) {
      return res.status(400).json({
        success: false,
        message: 'Refund already posted — block double refund',
      })
    }

    const refundUSD = Math.abs(Number(req.body?.refundUSD ?? ret.refundUSD ?? 0))
    const pnl = calcReturnPnL({
      refundUSD,
      labelCostUSD: ret.returnLabelCost || ret.labelCostUSD,
      mfgCostUSD: ret.mfgCostUSD,
      restockable: String(ret.condition || '').toLowerCase().includes('restock'),
    })
    const history = pushHistory(ret, 'Refund posted', `Refund $${refundUSD}. ${pnl.pnlBreakdown}`)

    const data = await Returns()
      .findOneAndUpdate(
        { $and: [tenantFilter(tid), { returnId }] },
        {
          $set: {
            refundUSD,
            refundPosted: true,
            refundPostedAt: new Date().toISOString(),
            refundPostedBy: req.user?.email || '',
            status: 'Refunded',
            profitImpactUSD: pnl.profitImpactUSD,
            pnlBreakdown: pnl.pnlBreakdown,
            history,
          },
        },
        { new: true },
      )
      .lean()

    try {
      await rollMonthlyPnL(tid, {
        labelCost: 0,
        refund: refundUSD,
        profitImpact: pnl.profitImpactUSD,
      })
    } catch {
      /* non-fatal */
    }

    res.json({ success: true, data, pnl, message: `Refund $${refundUSD} posted once` })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

/** POST /api/returns/actions/open-claim — carrier claim from return or standalone */
export async function openClaim(req, res) {
  try {
    const tid = tenantIdOf(req)
    const returnId = String(req.body?.returnId || '').trim()
    if (!returnId) return res.status(400).json({ success: false, message: 'returnId required' })

    const ret = await Returns()
      .findOne({ $and: [tenantFilter(tid), { returnId }] })
      .lean()
    if (!ret) return res.status(404).json({ success: false, message: 'Return not found' })

    const claimValueUSD = Math.abs(
      Number(req.body?.claimValueUSD ?? ret.claimValueUSD ?? ret.refundUSD ?? 0),
    )
    const history = pushHistory(
      ret,
      'Carrier claim opened',
      `Claim $${claimValueUSD}. ${req.body?.notes || 'Send disputed freight to Courier Audit if needed.'}`,
    )

    const data = await Returns()
      .findOneAndUpdate(
        { $and: [tenantFilter(tid), { returnId }] },
        {
          $set: {
            caseType: 'Claim',
            claimValueUSD,
            claimCarrier: req.body?.claimCarrier || ret.claimCarrier || '',
            claimAwb: req.body?.claimAwb || ret.returnAwb || ret.claimAwb || '',
            claimStatus: 'Open',
            status: 'Claim Open',
            linkedShipmentId: req.body?.linkedShipmentId || ret.linkedShipmentId || '',
            history,
          },
        },
        { new: true },
      )
      .lean()

    // Optional: seed a Courier Audit dispute stub
    if (req.body?.pushCourierAudit && (data.claimAwb || data.returnAwb)) {
      try {
        const Audit = getResourceModel('courier_audit', 'invoiceNo', true)
        const inv = `CLAIM-${returnId}`
        const exists = await Audit.findOne({ $and: [tenantFilter(tid), { invoiceNo: inv }] }).lean()
        if (!exists) {
          await Audit.create({
            invoiceNo: inv,
            carrier: data.claimCarrier || 'Carrier',
            awb: data.claimAwb || data.returnAwb,
            orderRef: data.orderId || '',
            billedUSD: claimValueUSD,
            expectedUSD: 0,
            differenceUSD: claimValueUSD,
            auditStatus: 'Disputed',
            status: 'Disputed',
            disputeRef: `FROM-${returnId}`,
            tenantId: tid,
            linkedReturnId: returnId,
            timeline: [
              {
                id: `ev-${Date.now()}`,
                at: new Date().toISOString(),
                by: req.user?.email || '',
                note: 'Opened from Returns claim',
              },
            ],
          })
        }
      } catch {
        /* non-fatal */
      }
    }

    res.json({ success: true, data, message: 'Claim opened' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
