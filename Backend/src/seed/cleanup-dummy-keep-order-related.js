/**
 * Keep only data related to real orders (and their SKUs).
 * Delete orphan / seed dummy rows in transactional collections.
 * Masters kept lightly: warehouses, carriers, currencies, companies, users, looms (capacity).
 */
import dotenv from 'dotenv'
import { connectDB } from '../config/db.js'
import { getResourceModel } from '../models/createResourceModel.js'

dotenv.config()

function hasOrderRef(doc, orderIds) {
  const candidates = [
    doc.orderId,
    doc.orderRef,
    doc.order,
    doc.marketplaceOrderId,
    doc.activeJobId,
  ]
  for (const c of candidates) {
    if (c != null && orderIds.has(String(c))) return true
    // MTO-ORD-xxx style
    if (c != null && String(c).startsWith('MTO-') && orderIds.has(String(c).slice(4))) return true
  }
  return false
}

function hasSkuRef(doc, skus) {
  const c = doc.sku || doc.SKU
  return c != null && skus.has(String(c))
}

async function purge(name, idField, keepFn) {
  const Model = getResourceModel(name, idField, true)
  const all = await Model.find({}).lean()
  let removed = 0
  for (const row of all) {
    if (keepFn(row)) continue
    const key = row[idField]
    if (key == null && !row._id) continue
    if (key != null) await Model.deleteOne({ [idField]: key })
    else await Model.deleteOne({ _id: row._id })
    removed += 1
  }
  const left = await Model.countDocuments({})
  console.log(`${name}: removed ${removed}, left ${left}`)
  return { removed, left }
}

async function main() {
  await connectDB(process.env.MONGODB_URI)
  const Order = getResourceModel('orders', 'orderId', true)
  const orders = await Order.find({}).lean()
  const orderIds = new Set(orders.map((o) => String(o.orderId)))
  const skus = new Set(orders.map((o) => String(o.sku)).filter(Boolean))
  const buyers = new Set(orders.map((o) => String(o.buyerName || '').toLowerCase()).filter(Boolean))

  console.log('Anchor orders:', orderIds.size, 'SKUs:', skus.size)

  // SKUs — only those on orders
  await purge('skus', 'sku', (r) => skus.has(String(r.sku)))

  // MTO — only linked to orders
  await purge('mto', 'id', (r) => hasOrderRef(r, orderIds) || orderIds.has(String(r.orderId || '')))

  // Shipments / packing / returns / audit / export / loading / receivables / PO / transfers
  await purge('shipments', 'awb', (r) => hasOrderRef(r, orderIds) || hasSkuRef(r, skus))
  await purge('packing_events', 'id', (r) => hasOrderRef(r, orderIds))
  await purge('returns', 'returnId', (r) => hasOrderRef(r, orderIds) || hasSkuRef(r, skus))
  {
    const Model = getResourceModel('courier_audit', 'invoiceNo', true)
    const Ship = getResourceModel('shipments', 'awb', true)
    const all = await Model.find({}).lean()
    let removed = 0
    for (const row of all) {
      const oid = row.orderId || row.orderRef
      if (oid && orderIds.has(String(oid))) continue
      if (hasSkuRef(row, skus)) continue
      if (row.awb) {
        const sh = await Ship.findOne({ awb: row.awb }).lean()
        if (sh && hasOrderRef(sh, orderIds)) continue
      }
      await Model.deleteOne({ invoiceNo: row.invoiceNo })
      removed += 1
    }
    console.log(`courier_audit: removed ${removed}, left ${await Model.countDocuments({})}`)
  }

  await purge('export_docs', 'invoiceNo', (r) => hasOrderRef(r, orderIds) || hasSkuRef(r, skus))
  await purge('loading_plans', 'planId', (r) => hasOrderRef(r, orderIds) || hasSkuRef(r, skus))
  await purge('receivables', 'invoiceNo', (r) => hasOrderRef(r, orderIds))
  await purge('purchase_orders', 'poNumber', (r) => {
    if (hasOrderRef(r, orderIds) || hasSkuRef(r, skus)) return true
    // keep PO if any line sku matches
    const lines = r.lines || r.items || []
    if (Array.isArray(lines) && lines.some((l) => skus.has(String(l.sku || '')))) return true
    return false
  })
  await purge('replenishment', 'shipmentId', (r) => hasOrderRef(r, orderIds) || hasSkuRef(r, skus))
  await purge('sku_history', 'recordKey', (r) => hasSkuRef(r, skus) || hasOrderRef(r, orderIds))

  // Buyers — keep if name matches an order buyer, else delete dummy
  await purge('buyers', 'code', (r) => {
    const name = String(r.name || r.company || r.code || '').toLowerCase()
    for (const b of buyers) {
      if (b && (name.includes(b) || b.includes(name))) return true
    }
    return false
  })

  // Alerts / failed jobs / automations — drop generic seed noise; keep if mentions order/sku
  await purge('alerts', 'id', (r) => {
    const blob = JSON.stringify(r).toLowerCase()
    for (const id of orderIds) if (blob.includes(String(id).toLowerCase())) return true
    for (const s of skus) if (blob.includes(String(s).toLowerCase())) return true
    return false
  })
  await purge('failed_jobs', 'jobId', (r) => {
    const blob = JSON.stringify(r).toLowerCase()
    for (const id of orderIds) if (blob.includes(String(id).toLowerCase())) return true
    return false
  })

  // Raw materials — not order-linked in seed; clear dummy catalog
  await purge('raw_materials', 'lotNo', () => false)

  // Looms — keep as capacity masters, but clear fake jobs not tied to live MTO
  {
    const Mto = getResourceModel('mto', 'id', true)
    const liveJobs = new Set((await Mto.find({}).select('id orderId').lean()).map((j) => String(j.id)))
    const Loom = getResourceModel('looms', 'loomId', true)
    const looms = await Loom.find({}).lean()
    for (const loom of looms) {
      const job = loom.activeJobId ? String(loom.activeJobId) : ''
      if (job && liveJobs.has(job)) continue
      await Loom.findOneAndUpdate(
        { loomId: loom.loomId },
        { $set: { activeJobId: null, orderId: null, sku: null, status: 'Idle / Available' } },
      )
    }
    // Re-link looms to live In-Process MTO jobs
    const openJobs = await Mto.find({ status: { $ne: 'Ready' } }).sort({ orderId: 1 }).lean()
    const idle = await Loom.find({
      $or: [{ activeJobId: null }, { activeJobId: { $exists: false } }, { activeJobId: '' }],
    })
      .sort({ loomId: 1 })
      .lean()
    let i = 0
    for (const job of openJobs) {
      if (i >= idle.length) break
      const loom = idle[i++]
      await Loom.findOneAndUpdate(
        { loomId: loom.loomId },
        {
          $set: {
            activeJobId: job.id,
            orderId: job.orderId,
            sku: job.sku,
            status: 'In Active Weaving',
          },
        },
      )
      await Mto.findOneAndUpdate({ id: job.id }, { $set: { loomId: loom.loomId } })
      console.log('loom link', loom.loomId, '←', job.id)
    }
    console.log('looms: kept', looms.length, '(capacity masters, jobs synced)')
  }

  // Warehouses — keep India / US only if possible
  {
    const Wh = getResourceModel('warehouses', 'id', true)
    const all = await Wh.find({}).lean()
    for (const w of all) {
      const label = `${w.name || ''} ${w.id || ''} ${w.code || ''}`.toLowerCase()
      const keep =
        label.includes('india') ||
        label.includes('usa') ||
        label.includes('us ') ||
        label.includes('edison') ||
        label.includes('bhadohi') ||
        label.includes('mirzapur')
      if (!keep) {
        await Wh.deleteOne({ id: w.id })
        console.log('warehouse drop', w.id || w.name)
      }
    }
    console.log('warehouses left', await Wh.countDocuments({}))
  }

  // Financial rollups — rebuild light stubs from current orders (optional clear dummy periods)
  // Keep monthly that might be used; clear clearly fake seed-only if no order link field
  // Leave monthly/yearly as-is if few; user cares about transactional dummy
  console.log('monthly_financials left', await getResourceModel('monthly_financials', 'period', true).countDocuments({}))
  console.log('carriers/currencies/users/companies kept as masters')

  console.log('\nDone. Orders untouched:', orderIds.size)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
