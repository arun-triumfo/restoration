/**
 * Courier Audit depth: auto-diff, match to order/shipment, dispute/credit, CSV import, totals.
 */
import { DEFAULT_TENANT_ID } from '../constants/tenant.js'
import { getResourceModel } from '../models/createResourceModel.js'

function tenantIdOf(req) {
  return req.user?.tenantId || DEFAULT_TENANT_ID
}

function Audit() {
  return getResourceModel('courier_audit', 'invoiceNo', true)
}

function Orders() {
  return getResourceModel('orders', 'orderId', true)
}

function Shipments() {
  return getResourceModel('shipments', 'awb', true)
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

function enrichAuditFields(payload) {
  const expectedUSD = Number(payload.expectedUSD ?? payload.expectedAmount ?? payload.agreedAmount ?? 0)
  const billedUSD = Number(payload.billedUSD ?? payload.billedAmount ?? payload.amountBilled ?? 0)
  const creditUSD = Number(payload.creditUSD || 0)
  const differenceUSD = Math.round((billedUSD - expectedUSD) * 100) / 100
  const netCostUSD = Math.round((billedUSD - creditUSD) * 100) / 100

  const billedW = Number(payload.billedWeightKg ?? payload.billedWeight ?? 0)
  const actualW = Number(payload.actualWeightKg ?? payload.actualWeight ?? payload.recordedWeightKg ?? 0)
  const weightMismatch = billedW > 0 && actualW > 0 && Math.abs(billedW - actualW) > 0.15
  const priceMismatch = expectedUSD > 0 && billedUSD > 0 && Math.abs(differenceUSD) > 0.5
  const overbilled = differenceUSD > 0.5

  let auditStatus = payload.auditStatus || payload.status || 'Needs Review'
  if (payload.auditStatus) auditStatus = payload.auditStatus
  else if (!overbilled && !weightMismatch) auditStatus = 'Verified'
  else if (overbilled || weightMismatch) auditStatus = 'Needs Review'

  return {
    ...payload,
    expectedUSD,
    billedUSD,
    creditUSD,
    differenceUSD,
    netCostUSD,
    billedWeightKg: billedW || payload.billedWeightKg,
    actualWeightKg: actualW || payload.actualWeightKg,
    overbilled,
    logisticsError: Boolean(payload.logisticsError || overbilled || weightMismatch),
    auditStatus,
    status: auditStatus,
    flagReason:
      payload.flagReason ||
      [
        weightMismatch ? `Weight mismatch billed ${billedW} vs recorded ${actualW}` : null,
        priceMismatch ? `Amount mismatch billed $${billedUSD} vs expected $${expectedUSD}` : null,
      ]
        .filter(Boolean)
        .join('; '),
  }
}

async function pushTimeline(doc, note, by) {
  const timeline = Array.isArray(doc.timeline) ? [...doc.timeline] : []
  timeline.push({
    id: `ev-${Date.now()}`,
    at: new Date().toISOString(),
    by: by || 'system',
    note,
  })
  return timeline
}

async function rollCourierCredit(tid, creditUSD) {
  if (!creditUSD) return
  const period = new Date().toISOString().slice(0, 7)
  const existing = await Monthly().findOne({ period, tenantId: tid }).lean()
  await Monthly().findOneAndUpdate(
    { period, tenantId: tid },
    {
      $set: {
        period,
        periodShort: period,
        tenantId: tid,
        courierCreditsUSD: Number(existing?.courierCreditsUSD || 0) + Number(creditUSD),
        shippingOutflowsUSD: Math.max(
          0,
          Number(existing?.shippingOutflowsUSD || 0) - Number(creditUSD),
        ),
        updatedFrom: 'courier_audit',
      },
    },
    { upsert: true },
  )
}

/** POST /api/courier_audit/actions/match */
export async function matchAudit(req, res) {
  try {
    const tid = tenantIdOf(req)
    const invoiceNo = String(req.body?.invoiceNo || '').trim()
    if (!invoiceNo) return res.status(400).json({ success: false, message: 'invoiceNo required' })

    const row = await Audit()
      .findOne({ $and: [tenantFilter(tid), { invoiceNo }] })
      .lean()
    if (!row) return res.status(404).json({ success: false, message: 'Audit row not found' })

    const awb = String(req.body?.awb || row.awb || '').trim()
    let orderRef = String(req.body?.orderRef || row.orderRef || '').trim()
    let matchedFrom = row.matchedFrom || ''
    let expectedUSD = Number(row.expectedUSD || 0)
    let actualWeightKg = Number(row.actualWeightKg || 0)
    let sku = row.sku || ''

    if (awb) {
      const ship = await Shipments()
        .findOne({ $and: [tenantFilter(tid), { awb }] })
        .lean()
      if (ship) {
        matchedFrom = 'shipments'
        orderRef = orderRef || ship.orderId || ''
        expectedUSD = expectedUSD || Number(ship.labelCostUSD || ship.amountUSD || ship.freightUSD || 0)
        actualWeightKg = actualWeightKg || Number(ship.actualWeightKg || ship.weightKg || 0)
        sku = sku || ship.sku || ''
      }
    }

    if (orderRef) {
      const order = await Orders()
        .findOne({ $and: [tenantFilter(tid), { orderId: orderRef }] })
        .lean()
      if (order) {
        matchedFrom = matchedFrom || 'orders'
        expectedUSD =
          expectedUSD || Number(order.labelCostUSD || order.shippingCostUSD || order.courierCostUSD || 0)
        actualWeightKg = actualWeightKg || Number(order.weightKg || order.actualWeightKg || 0)
        sku = sku || order.sku || ''
        if (!awb && order.awb) {
          /* keep */
        }
      }
    }

    const enriched = enrichAuditFields({
      ...row,
      awb: awb || row.awb,
      orderRef,
      sku,
      expectedUSD,
      actualWeightKg,
      matchedFrom,
      matchedAt: new Date().toISOString(),
    })
    const timeline = await pushTimeline(row, `Matched AWB/order (expected $${enriched.expectedUSD})`, req.user?.email)

    const data = await Audit()
      .findOneAndUpdate(
        { $and: [tenantFilter(tid), { invoiceNo }] },
        { $set: { ...enriched, timeline } },
        { new: true },
      )
      .lean()

    res.json({
      success: true,
      data,
      message: enriched.overbilled
        ? `Matched — overbilled by $${enriched.differenceUSD}`
        : 'Matched — within tolerance',
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

/** POST /api/courier_audit/actions/dispute */
export async function disputeAudit(req, res) {
  try {
    const tid = tenantIdOf(req)
    const invoiceNo = String(req.body?.invoiceNo || '').trim()
    if (!invoiceNo) return res.status(400).json({ success: false, message: 'invoiceNo required' })

    const row = await Audit()
      .findOne({ $and: [tenantFilter(tid), { invoiceNo }] })
      .lean()
    if (!row) return res.status(404).json({ success: false, message: 'Audit row not found' })

    const disputeRef = String(req.body?.disputeRef || `DISP-${invoiceNo}`).trim()
    const note = String(req.body?.note || 'Disputed with carrier').trim()
    const timeline = await pushTimeline(row, `Disputed (${disputeRef}): ${note}`, req.user?.email)

    const data = await Audit()
      .findOneAndUpdate(
        { $and: [tenantFilter(tid), { invoiceNo }] },
        {
          $set: {
            auditStatus: 'Disputed',
            status: 'Disputed',
            disputeRef,
            disputeNote: note,
            disputedAt: new Date().toISOString(),
            disputedBy: req.user?.email || '',
            timeline,
          },
        },
        { new: true },
      )
      .lean()

    res.json({ success: true, data, message: `Dispute opened: ${disputeRef}` })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

/** POST /api/courier_audit/actions/resolve-credit */
export async function resolveCredit(req, res) {
  try {
    const tid = tenantIdOf(req)
    const invoiceNo = String(req.body?.invoiceNo || '').trim()
    if (!invoiceNo) return res.status(400).json({ success: false, message: 'invoiceNo required' })

    const row = await Audit()
      .findOne({ $and: [tenantFilter(tid), { invoiceNo }] })
      .lean()
    if (!row) return res.status(404).json({ success: false, message: 'Audit row not found' })

    if (row.creditPosted) {
      return res.status(400).json({
        success: false,
        message: 'Credit already posted to Profitability — avoid double count',
      })
    }

    const creditUSD = Math.abs(
      Number(req.body?.creditUSD ?? row.differenceUSD ?? row.creditUSD ?? 0),
    )
    const enriched = enrichAuditFields({
      ...row,
      creditUSD,
      auditStatus: 'Resolved',
      status: 'Resolved',
    })
    const timeline = await pushTimeline(
      row,
      `Credit $${creditUSD} confirmed → Profitability`,
      req.user?.email,
    )

    const data = await Audit()
      .findOneAndUpdate(
        { $and: [tenantFilter(tid), { invoiceNo }] },
        {
          $set: {
            ...enriched,
            creditPosted: true,
            creditPostedAt: new Date().toISOString(),
            timeline,
          },
        },
        { new: true },
      )
      .lean()

    try {
      await rollCourierCredit(tid, creditUSD)
    } catch {
      /* non-fatal */
    }

    res.json({
      success: true,
      data,
      message: `Credit $${creditUSD} posted (net cost $${enriched.netCostUSD})`,
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

/** POST /api/courier_audit/actions/import-csv  body: { csv: string } */
export async function importCsv(req, res) {
  try {
    const tid = tenantIdOf(req)
    const csv = String(req.body?.csv || '')
    if (!csv.trim()) return res.status(400).json({ success: false, message: 'csv text required' })

    const lines = csv
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
    if (lines.length < 2) {
      return res.status(400).json({ success: false, message: 'Need header + at least one row' })
    }

    const header = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, ''))
    const idx = (names) => {
      for (const n of names) {
        const i = header.indexOf(n)
        if (i >= 0) return i
      }
      return -1
    }
    const iInv = idx(['invoiceno', 'invoice', 'billno'])
    const iCarrier = idx(['carrier', 'courier'])
    const iAwb = idx(['awb', 'tracking', 'hawb'])
    const iOrder = idx(['orderref', 'order', 'orderid'])
    const iExpected = idx(['expectedusd', 'expected', 'agreed', 'agreedamount'])
    const iBilled = idx(['billedusd', 'billed', 'amount', 'billedamount'])
    const iBillDate = idx(['billdate', 'date'])
    const iBw = idx(['billedweightkg', 'billedweight', 'billweight'])
    const iAw = idx(['actualweightkg', 'actualweight', 'recordedweight'])

    const created = []
    const skipped = []

    for (let li = 1; li < lines.length; li++) {
      const cols = splitCsvLine(lines[li])
      const invoiceNo = (iInv >= 0 ? cols[iInv] : '') || `CA-IMP-${Date.now()}-${li}`
      const exists = await Audit()
        .findOne({ $and: [tenantFilter(tid), { invoiceNo }] })
        .lean()
      if (exists) {
        skipped.push(invoiceNo)
        continue
      }
      const raw = {
        invoiceNo,
        carrier: iCarrier >= 0 ? cols[iCarrier] : '',
        awb: iAwb >= 0 ? cols[iAwb] : '',
        orderRef: iOrder >= 0 ? cols[iOrder] : '',
        billDate: iBillDate >= 0 ? cols[iBillDate] : new Date().toISOString().slice(0, 10),
        expectedUSD: iExpected >= 0 ? Number(cols[iExpected] || 0) : 0,
        billedUSD: iBilled >= 0 ? Number(cols[iBilled] || 0) : 0,
        billedWeightKg: iBw >= 0 ? Number(cols[iBw] || 0) : 0,
        actualWeightKg: iAw >= 0 ? Number(cols[iAw] || 0) : 0,
        tenantId: tid,
        importedAt: new Date().toISOString(),
        timeline: [
          {
            id: `ev-${Date.now()}-${li}`,
            at: new Date().toISOString(),
            by: req.user?.email || 'import',
            note: 'Imported from CSV',
          },
        ],
      }
      const enriched = enrichAuditFields(raw)
      await Audit().create(enriched)
      created.push(invoiceNo)
    }

    res.json({
      success: true,
      created: created.length,
      skipped: skipped.length,
      invoiceNos: created,
      message: `Imported ${created.length} rows (${skipped.length} skipped duplicates)`,
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

/** GET /api/courier_audit/actions/summary */
export async function auditSummary(req, res) {
  try {
    const tid = tenantIdOf(req)
    const rows = await Audit().find(tenantFilter(tid)).lean()
    const summary = {
      count: rows.length,
      billedUSD: 0,
      expectedUSD: 0,
      differenceUSD: 0,
      creditUSD: 0,
      netCostUSD: 0,
      disputed: 0,
      needsReview: 0,
      verified: 0,
      resolved: 0,
    }
    for (const r of rows) {
      summary.billedUSD += Number(r.billedUSD || 0)
      summary.expectedUSD += Number(r.expectedUSD || 0)
      summary.differenceUSD += Number(r.differenceUSD || 0)
      summary.creditUSD += Number(r.creditUSD || 0)
      summary.netCostUSD += Number(r.netCostUSD ?? Number(r.billedUSD || 0) - Number(r.creditUSD || 0))
      const st = String(r.auditStatus || r.status || '')
      if (/disput/i.test(st)) summary.disputed += 1
      else if (/review/i.test(st)) summary.needsReview += 1
      else if (/verif/i.test(st)) summary.verified += 1
      else if (/resolv/i.test(st)) summary.resolved += 1
    }
    for (const k of ['billedUSD', 'expectedUSD', 'differenceUSD', 'creditUSD', 'netCostUSD']) {
      summary[k] = Math.round(summary[k] * 100) / 100
    }
    res.json({ success: true, data: summary })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

function splitCsvLine(line) {
  const out = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQ = !inQ
      continue
    }
    if (ch === ',' && !inQ) {
      out.push(cur.trim())
      cur = ''
      continue
    }
    cur += ch
  }
  out.push(cur.trim())
  return out
}

export { enrichAuditFields }
