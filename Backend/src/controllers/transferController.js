/**
 * Stock transfer inventory posting — additive; never double-posts the same transfer.
 * Dispatch: India available → In Transit
 * Receive: In Transit → US available (+ quarantine note via history for damaged)
 */
import { getResourceModel } from '../models/createResourceModel.js'
import { DEFAULT_TENANT_ID } from '../constants/tenant.js'

function Sku() {
  return getResourceModel('skus', 'sku', true)
}
function Transfer() {
  return getResourceModel('replenishment', 'shipmentId', true)
}
function History() {
  return getResourceModel('sku_history', 'recordKey', false)
}

function tenantOf(req) {
  return req.user?.tenantId || DEFAULT_TENANT_ID
}

function stockOf(sku) {
  const s = sku.stock || {}
  return {
    indiaAvailable: Number(s.indiaAvailable ?? sku.indiaAvailable ?? 0),
    indiaPacked: Number(s.indiaPacked || 0),
    inTransit: Number(s.inTransit || 0),
    usaAvailable: Number(s.usaAvailable ?? sku.usaAvailable ?? 0),
    usaReserved: Number(s.usaReserved || 0),
    fba: Number(s.fba || 0),
  }
}

async function writeHistory(tid, row) {
  await History().create({
    ...row,
    tenantId: tid,
    timestamp: row.timestamp || new Date().toISOString(),
  })
}

function itemsOf(transfer) {
  const items = Array.isArray(transfer.items) ? transfer.items : []
  if (items.length) return items.filter((i) => i && i.sku && Number(i.qty) > 0)
  // Legacy rows: parse "12 rugs" style note — no SKU lines → nothing to post
  return []
}

/** POST /api/transfers/:shipmentId/dispatch */
export async function dispatchTransfer(req, res) {
  try {
    const tid = tenantOf(req)
    const shipmentId = req.params.shipmentId
    const transfer = await Transfer().findOne({ shipmentId, tenantId: tid }).lean()
    if (!transfer) {
      const any = await Transfer().findOne({ shipmentId }).lean()
      if (!any) return res.status(404).json({ success: false, message: 'Transfer not found' })
      // allow platform demo tenant mismatch soft-read
    }
    const doc = transfer || (await Transfer().findOne({ shipmentId }).lean())
    if (doc.dispatchedPosted) {
      return res.json({ success: true, message: 'Already dispatched to in-transit', transfer: doc })
    }
    const items = itemsOf(doc)
    if (!items.length) {
      return res.status(400).json({
        success: false,
        message: 'Add rug SKU lines (Rugs & Packing tab) before dispatch posting',
      })
    }

    for (const line of items) {
      const sku = await Sku().findOne({ sku: line.sku }).lean()
      if (!sku) {
        return res.status(400).json({ success: false, message: `SKU not found: ${line.sku}` })
      }
      const st = stockOf(sku)
      const qty = Number(line.qty || 0)
      if (st.indiaAvailable < qty) {
        return res.status(400).json({
          success: false,
          message: `Not enough India stock for ${line.sku} (have ${st.indiaAvailable}, need ${qty})`,
        })
      }
      const next = {
        ...st,
        indiaAvailable: st.indiaAvailable - qty,
        inTransit: st.inTransit + qty,
      }
      await Sku().findOneAndUpdate(
        { sku: line.sku },
        { $set: { stock: next, indiaAvailable: next.indiaAvailable, usaAvailable: next.usaAvailable } },
      )
      await writeHistory(tid, {
        recordKey: `${shipmentId}-dispatch-${line.sku}-${Date.now()}`,
        sku: line.sku,
        type: 'MOVE',
        qty,
        source: 'India WH',
        dest: `In Transit · ${shipmentId}`,
        user: req.user?.email || 'transfer',
        ref: `Dispatch ${shipmentId}`,
      })
    }

    const status = doc.status === 'Draft' || doc.status === 'Packed' ? 'Dispatched India' : doc.status
    const timeline = Array.isArray(doc.timeline) ? [...doc.timeline] : []
    timeline.push({
      id: `ev-${Date.now()}`,
      at: new Date().toISOString(),
      status,
      by: req.user?.email || 'system',
      note: 'Inventory posted: India → In Transit',
    })

    const updated = await Transfer()
      .findOneAndUpdate(
        { shipmentId },
        {
          $set: {
            dispatchedPosted: true,
            status,
            timeline,
          },
        },
        { new: true },
      )
      .lean()

    res.json({ success: true, message: 'Dispatched — stock moved to In Transit', transfer: updated })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

/** POST /api/transfers/:shipmentId/receive  body: { lines: [{ sku, good, damaged, missing }] } */
export async function receiveTransfer(req, res) {
  try {
    const tid = tenantOf(req)
    const shipmentId = req.params.shipmentId
    const doc = await Transfer().findOne({ shipmentId }).lean()
    if (!doc) return res.status(404).json({ success: false, message: 'Transfer not found' })
    if (!doc.dispatchedPosted) {
      return res.status(400).json({
        success: false,
        message: 'Dispatch inventory first before US receiving',
      })
    }
    if (doc.receivedPosted) {
      return res.json({ success: true, message: 'Already received', transfer: doc })
    }

    const items = itemsOf(doc)
    const bodyLines = Array.isArray(req.body?.lines) ? req.body.lines : null
    const lines =
      bodyLines ||
      items.map((i) => ({
        sku: i.sku,
        good: Number(i.receivedQty ?? i.qty) - Number(i.damagedQty || 0) - Number(i.missingQty || 0),
        damaged: Number(i.damagedQty || 0),
        missing: Number(i.missingQty || 0),
      }))

    let totalGood = 0
    let totalDamaged = 0
    let totalMissing = 0

    for (const line of lines) {
      const skuCode = line.sku
      const good = Number(line.good || 0)
      const damaged = Number(line.damaged || 0)
      const missing = Number(line.missing || 0)
      totalGood += good
      totalDamaged += damaged
      totalMissing += missing
      const shipped = items.find((i) => i.sku === skuCode)
      const expect = Number(shipped?.qty || good + damaged + missing)
      const takeFromTransit = Math.min(expect, good + damaged + missing)

      const sku = await Sku().findOne({ sku: skuCode }).lean()
      if (!sku) continue
      const st = stockOf(sku)
      const next = {
        ...st,
        inTransit: Math.max(0, st.inTransit - takeFromTransit),
        usaAvailable: st.usaAvailable + good,
      }
      await Sku().findOneAndUpdate(
        { sku: skuCode },
        { $set: { stock: next, indiaAvailable: next.indiaAvailable, usaAvailable: next.usaAvailable } },
      )
      if (good) {
        await writeHistory(tid, {
          recordKey: `${shipmentId}-recv-good-${skuCode}-${Date.now()}`,
          sku: skuCode,
          type: 'IN',
          qty: good,
          source: `In Transit · ${shipmentId}`,
          dest: 'US WH available',
          user: req.user?.email || 'transfer',
          ref: `Receive good ${shipmentId}`,
        })
      }
      if (damaged) {
        await writeHistory(tid, {
          recordKey: `${shipmentId}-recv-dmg-${skuCode}-${Date.now()}`,
          sku: skuCode,
          type: 'OUT',
          qty: damaged,
          source: `In Transit · ${shipmentId}`,
          dest: 'US Quarantine / damage',
          user: req.user?.email || 'transfer',
          ref: `Damaged on receive ${shipmentId}`,
        })
      }
      if (missing) {
        await writeHistory(tid, {
          recordKey: `${shipmentId}-recv-miss-${skuCode}-${Date.now()}`,
          sku: skuCode,
          type: 'OUT',
          qty: missing,
          source: `In Transit · ${shipmentId}`,
          dest: 'Discrepancy / missing',
          user: req.user?.email || 'transfer',
          ref: `Missing on receive ${shipmentId}`,
        })
      }
    }

    const hasException = totalDamaged > 0 || totalMissing > 0
    const status = hasException ? 'Partially received' : 'Fully received'
    const timeline = Array.isArray(doc.timeline) ? [...doc.timeline] : []
    timeline.push({
      id: `ev-${Date.now()}`,
      at: new Date().toISOString(),
      status,
      by: req.user?.email || 'system',
      note: `US receive: good ${totalGood}, damaged ${totalDamaged}, missing ${totalMissing}`,
    })

    const updated = await Transfer()
      .findOneAndUpdate(
        { shipmentId },
        {
          $set: {
            receivedPosted: true,
            status,
            timeline,
            receipt: {
              ...(doc.receipt || {}),
              receivedGood: totalGood,
              damaged: totalDamaged,
              missing: totalMissing,
              receivedAt: new Date().toISOString().slice(0, 10),
              receiver: req.user?.email || '',
            },
            // block auto-close when exceptions exist (client rule)
            reconciliationStatus: hasException ? 'Exceptions open' : 'Ready to close',
          },
        },
        { new: true },
      )
      .lean()

    res.json({
      success: true,
      message: hasException
        ? 'Received with exceptions — resolve before Close'
        : 'Fully received — US available updated',
      transfer: updated,
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
