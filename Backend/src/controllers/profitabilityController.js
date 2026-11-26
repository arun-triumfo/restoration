/**
 * Profitability depth: period rollup + drill-down from returns, courier, exports, orders.
 */
import { DEFAULT_TENANT_ID } from '../constants/tenant.js'
import { getResourceModel } from '../models/createResourceModel.js'

function tenantIdOf(req) {
  return req.user?.tenantId || DEFAULT_TENANT_ID
}

function tenantFilter(tid) {
  if (tid === DEFAULT_TENANT_ID) {
    return {
      $or: [{ tenantId: tid }, { tenantId: { $exists: false } }, { tenantId: null }],
    }
  }
  return { tenantId: tid }
}

function Monthly() {
  return getResourceModel('monthly_financials', 'period', true)
}
function Returns() {
  return getResourceModel('returns', 'returnId', true)
}
function Audit() {
  return getResourceModel('courier_audit', 'invoiceNo', true)
}
function ExportDocs() {
  return getResourceModel('export_docs', 'invoiceNo', true)
}
function Transfers() {
  return getResourceModel('replenishment', 'shipmentId', true)
}
function Orders() {
  return getResourceModel('orders', 'orderId', true)
}

function inPeriod(iso, period) {
  if (!period) return true
  const s = String(iso || '')
  return s.startsWith(period) || s.slice(0, 7) === period
}

/** GET /api/profitability/actions/dashboard?period=YYYY-MM */
export async function profitabilityDashboard(req, res) {
  try {
    const tid = tenantIdOf(req)
    const period = String(req.query?.period || new Date().toISOString().slice(0, 7)).trim()

    const [monthly, returns, audits, exports, transfers, orders] = await Promise.all([
      Monthly().findOne({ $and: [tenantFilter(tid), { period }] }).lean(),
      Returns().find(tenantFilter(tid)).lean(),
      Audit().find(tenantFilter(tid)).lean(),
      ExportDocs().find(tenantFilter(tid)).lean(),
      Transfers().find(tenantFilter(tid)).lean(),
      Orders().find(tenantFilter(tid)).limit(500).lean(),
    ])

    const periodReturns = returns.filter(
      (r) =>
        inPeriod(r.labelSentAt || r.receivedAt || r.updatedAt || r.createdAt, period) ||
        inPeriod(r.date, period),
    )
    const periodAudits = audits.filter(
      (a) => inPeriod(a.billDate || a.creditPostedAt || a.updatedAt || a.createdAt, period),
    )
    const periodExports = exports.filter((e) => inPeriod(e.date || e.updatedAt || e.createdAt, period))

    const returnsRefundUSD = periodReturns.reduce((s, r) => s + Number(r.refundUSD || 0), 0)
    const returnsLabelUSD = periodReturns.reduce(
      (s, r) => s + Number(r.returnLabelCost || r.labelCostUSD || 0),
      0,
    )
    const returnsPnLUSD = periodReturns.reduce((s, r) => s + Number(r.profitImpactUSD || 0), 0)
    const courierBilled = periodAudits.reduce((s, a) => s + Number(a.billedUSD || 0), 0)
    const courierCredits = periodAudits.reduce((s, a) => s + Number(a.creditUSD || 0), 0)
    const courierNet = periodAudits.reduce(
      (s, a) => s + Number(a.netCostUSD ?? Number(a.billedUSD || 0) - Number(a.creditUSD || 0)),
      0,
    )

    const exportFreightEst = transfers
      .filter((t) => inPeriod(t.etd || t.updatedAt || t.createdAt, period))
      .reduce((s, t) => {
        const exps = Array.isArray(t.expenses) ? t.expenses : []
        return (
          s +
          exps.reduce((x, e) => {
            if (String(e.estimatedOrActual) === 'actual') return x + Number(e.amount || 0)
            return x + Number(e.amount || 0) * 0.5 // estimated half-weight until actual
          }, 0)
        )
      }, 0)

    const orderInflows = orders
      .filter((o) => inPeriod(o.orderDate || o.createdAt || o.updatedAt, period))
      .reduce((s, o) => s + Number(o.totalOrderUSD || o.unitPriceUSD || 0), 0)

    const shippedOrders = orders.filter(
      (o) =>
        /ship|dispatch|deliver/i.test(String(o.status || '')) &&
        inPeriod(o.shippedAt || o.updatedAt || o.orderDate, period),
    )

    const rollup = {
      period,
      orderInflowsUSD: Math.round((Number(monthly?.orderInflowsUSD) || orderInflows) * 100) / 100,
      exportInflowsUSD: Number(monthly?.exportInflowsUSD || 0),
      shippingOutflowsUSD:
        Math.round(
          (Number(monthly?.shippingOutflowsUSD) || courierNet + returnsLabelUSD + exportFreightEst) *
            100,
        ) / 100,
      returnsCostUSD:
        Math.round((Number(monthly?.returnsCostUSD) || returnsRefundUSD + returnsLabelUSD) * 100) /
        100,
      returnsRefundUSD: Math.round((Number(monthly?.returnsRefundUSD) || returnsRefundUSD) * 100) / 100,
      returnsPnLUSD: Math.round((Number(monthly?.returnsPnLUSD) || returnsPnLUSD) * 100) / 100,
      courierCreditsUSD:
        Math.round((Number(monthly?.courierCreditsUSD) || courierCredits) * 100) / 100,
      courierBilledUSD: Math.round(courierBilled * 100) / 100,
      courierNetUSD: Math.round(courierNet * 100) / 100,
      exportFreightUSD: Math.round(exportFreightEst * 100) / 100,
      commissionsUSD: Number(monthly?.commissionsUSD || 0),
    }

    const gross =
      rollup.orderInflowsUSD +
      rollup.exportInflowsUSD -
      rollup.shippingOutflowsUSD -
      rollup.returnsCostUSD -
      rollup.commissionsUSD +
      rollup.courierCreditsUSD
    rollup.estimatedMarginUSD = Math.round(gross * 100) / 100

    res.json({
      success: true,
      data: {
        rollup,
        monthlyRow: monthly,
        drillDown: {
          returns: periodReturns.map((r) => ({
            returnId: r.returnId,
            caseType: r.caseType || 'Return',
            orderId: r.orderId,
            status: r.status,
            refundUSD: r.refundUSD,
            profitImpactUSD: r.profitImpactUSD,
            exportShipmentId: r.linkedShipmentId || r.exportShipmentId,
          })),
          courier: periodAudits.map((a) => ({
            invoiceNo: a.invoiceNo,
            awb: a.awb,
            orderRef: a.orderRef,
            billedUSD: a.billedUSD,
            expectedUSD: a.expectedUSD,
            creditUSD: a.creditUSD,
            auditStatus: a.auditStatus || a.status,
            differenceUSD: a.differenceUSD,
          })),
          exports: periodExports.map((e) => ({
            invoiceNo: e.invoiceNo,
            exportShipmentId: e.exportShipmentId,
            stockTransferId: e.stockTransferId,
            consignee: e.consignee,
            docStatus: e.docStatus,
            customsStatus: e.customsStatus,
          })),
          transfers: transfers
            .filter((t) => inPeriod(t.etd || t.updatedAt, period))
            .map((t) => ({
              shipmentId: t.shipmentId,
              exportShipmentId: t.exportShipmentId,
              status: t.status,
              shippingMode: t.shippingMode,
              expenseTotal: (Array.isArray(t.expenses) ? t.expenses : []).reduce(
                (s, e) => s + Number(e.amount || 0),
                0,
              ),
            })),
          shippedOrderCount: shippedOrders.length,
        },
        views: [
          { id: 'period', label: 'By period (month)' },
          { id: 'export', label: 'By export shipment' },
          { id: 'channel', label: 'By order channel' },
          { id: 'returns', label: 'Returns & claims impact' },
          { id: 'courier', label: 'Courier net vs credits' },
        ],
      },
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

/** POST /api/profitability/actions/sync-period  — refresh monthly row from live sources */
export async function syncPeriod(req, res) {
  try {
    const tid = tenantIdOf(req)
    const period = String(req.body?.period || new Date().toISOString().slice(0, 7)).trim()
    // Reuse dashboard math
    req.query = { ...(req.query || {}), period }
    const fakeRes = {
      json(payload) {
        this.payload = payload
      },
      status(code) {
        this.statusCode = code
        return this
      },
    }
    await profitabilityDashboard(req, fakeRes)
    if (!fakeRes.payload?.success) {
      return res.status(500).json(fakeRes.payload || { success: false, message: 'Sync failed' })
    }
    const rollup = fakeRes.payload.data.rollup
    const data = await Monthly()
      .findOneAndUpdate(
        { period, tenantId: tid },
        {
          $set: {
            ...rollup,
            periodShort: period,
            quarter: `Q${Math.ceil(Number(period.slice(5, 7)) / 3)}`,
            tenantId: tid,
            updatedFrom: 'profitability_sync',
            syncedAt: new Date().toISOString(),
          },
        },
        { upsert: true, new: true },
      )
      .lean()

    res.json({
      success: true,
      data,
      message: `Period ${period} synced from returns / courier / orders`,
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
