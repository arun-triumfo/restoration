/**
 * Export Docs depth: create from Stock Transfer, document versions,
 * printable commercial invoice + packing list (browser PDF).
 */
import { DEFAULT_TENANT_ID } from '../constants/tenant.js'
import { getResourceModel } from '../models/createResourceModel.js'

function tenantIdOf(req) {
  return req.user?.tenantId || DEFAULT_TENANT_ID
}

function ExportDocs() {
  return getResourceModel('export_docs', 'invoiceNo', true)
}

function Transfers() {
  return getResourceModel('replenishment', 'shipmentId', true)
}

function tenantFilter(tid) {
  if (tid === DEFAULT_TENANT_ID) {
    return {
      $or: [{ tenantId: tid }, { tenantId: { $exists: false } }, { tenantId: null }],
    }
  }
  return { tenantId: tid }
}

function nextInvoiceNo(exportShipmentId) {
  const suffix = String(exportShipmentId || 'EXP')
    .replace(/[^A-Z0-9-]/gi, '')
    .slice(-8)
  return `CI-${suffix || Date.now()}`
}

function defaultChecklist() {
  return [
    { category: 'Proforma / Commercial invoice', state: 'Pending' },
    { category: 'Packing list', state: 'Pending' },
    { category: 'Certificate of origin', state: 'Pending' },
    { category: 'India shipping bill / LEO', state: 'Pending' },
    { category: 'BL / AWB', state: 'Pending' },
    { category: 'ISF / US entry', state: 'Pending' },
    { category: 'Duty / release', state: 'Pending' },
  ]
}

function emptyDocFile() {
  return {
    id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: 'Other',
    refNo: '',
    issueDate: '',
    status: 'Pending',
    fileName: '',
    fileUrl: '',
    mimeType: '',
    notes: '',
    uploadedBy: '',
    uploadedAt: '',
    version: 1,
    versions: [],
  }
}

/** POST /api/export_docs/actions/create-from-transfer */
export async function createFromTransfer(req, res) {
  try {
    const tid = tenantIdOf(req)
    const shipmentId = String(req.body?.shipmentId || req.body?.stockTransferId || '').trim()
    if (!shipmentId) {
      return res.status(400).json({ success: false, message: 'shipmentId required' })
    }

    const transfer = await Transfers()
      .findOne({ $and: [tenantFilter(tid), { shipmentId }] })
      .lean()
    if (!transfer) {
      return res.status(404).json({ success: false, message: 'Stock transfer not found' })
    }

    const exportShipmentId =
      String(req.body?.exportShipmentId || transfer.exportShipmentId || '').trim() ||
      `EXP-USA-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`

    const existing = await ExportDocs()
      .findOne({
        $and: [tenantFilter(tid), { exportShipmentId }],
      })
      .lean()
    if (existing && !req.body?.forceNew) {
      return res.json({
        success: true,
        data: existing,
        message: 'Export file already exists for this EXP-ID — opened existing (no duplicate)',
      })
    }

    const invoiceNo = String(req.body?.invoiceNo || '').trim() || nextInvoiceNo(exportShipmentId)
    const items = Array.isArray(transfer.items) ? transfer.items : []
    const payload = {
      invoiceNo,
      exportShipmentId,
      stockTransferId: shipmentId,
      date: new Date().toISOString().slice(0, 10),
      consignee: transfer.importerOfRecord || transfer.destWh || 'US importer',
      destination: transfer.pod || transfer.destWh || 'USA',
      shipmentType: transfer.shippingMode || transfer.transitMode || '',
      incoterms: transfer.incoterm || 'FOB',
      hsn: transfer.hsn || items[0]?.hsn || '5701.10',
      customsStatus: transfer.usIsfStatus || 'Pending',
      docStatus: 'Draft',
      loadingPlanId: transfer.loadingPlanId || '',
      orderId: transfer.orderId || '',
      blNumber: transfer.blNumber || '',
      containerNo: transfer.containerNo || '',
      pol: transfer.pol || '',
      pod: transfer.pod || '',
      vesselVoyage: transfer.vesselVoyage || '',
      indiaShippingBill: transfer.indiaShippingBill || '',
      leoDate: transfer.leoDate || '',
      usIsfStatus: transfer.usIsfStatus || '',
      importerOfRecord: transfer.importerOfRecord || '',
      entryNumber: transfer.entryNumber || '',
      dutiesUSD: Number(transfer.dutiesUSD || 0),
      lineItems: items.map((it) => ({
        sku: it.sku,
        title: it.title || it.sku,
        qty: Number(it.qty || 0),
        unitValueUsd: Number(it.unitValueUsd || 0),
        hsn: it.hsn || '',
      })),
      documentChecklist: defaultChecklist(),
      documents: [],
      timeline: [
        {
          id: `ev-${Date.now()}`,
          at: new Date().toISOString(),
          by: req.user?.email || 'system',
          note: `Export file created from transfer ${shipmentId}`,
        },
      ],
      tenantId: tid,
    }

    const created = await ExportDocs().create(payload)
    const data = created.toObject ? created.toObject() : created

    if (!transfer.exportShipmentId || transfer.exportShipmentId !== exportShipmentId) {
      await Transfers().findOneAndUpdate(
        { $and: [tenantFilter(tid), { shipmentId }] },
        { $set: { exportShipmentId } },
      )
    }

    res.status(201).json({
      success: true,
      data,
      message: `Export file ${invoiceNo} linked to ${exportShipmentId}`,
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

/** POST /api/export_docs/actions/add-document */
export async function addDocument(req, res) {
  try {
    const tid = tenantIdOf(req)
    const invoiceNo = String(req.body?.invoiceNo || '').trim()
    if (!invoiceNo) {
      return res.status(400).json({ success: false, message: 'invoiceNo required' })
    }

    const doc = await ExportDocs()
      .findOne({ $and: [tenantFilter(tid), { invoiceNo }] })
      .lean()
    if (!doc) return res.status(404).json({ success: false, message: 'Export doc not found' })

    const incoming = { ...emptyDocFile(), ...(req.body?.document || {}) }
    incoming.uploadedBy = req.user?.email || incoming.uploadedBy || ''
    incoming.uploadedAt = new Date().toISOString()
    incoming.id = incoming.id || emptyDocFile().id

    const docs = Array.isArray(doc.documents) ? [...doc.documents] : []
    const existingIdx = docs.findIndex(
      (d) => d.type === incoming.type && d.refNo && d.refNo === incoming.refNo,
    )

    if (existingIdx >= 0 && (incoming.fileUrl || incoming.fileName)) {
      const prev = docs[existingIdx]
      const versions = Array.isArray(prev.versions) ? [...prev.versions] : []
      versions.push({
        version: prev.version || 1,
        fileName: prev.fileName,
        fileUrl: prev.fileUrl,
        mimeType: prev.mimeType,
        uploadedAt: prev.uploadedAt,
        uploadedBy: prev.uploadedBy,
      })
      docs[existingIdx] = {
        ...prev,
        ...incoming,
        versions,
        version: (prev.version || 1) + 1,
        id: prev.id,
      }
    } else {
      docs.push(incoming)
    }

    const timeline = Array.isArray(doc.timeline) ? [...doc.timeline] : []
    timeline.push({
      id: `ev-${Date.now()}`,
      at: new Date().toISOString(),
      by: req.user?.email || 'system',
      note: `Document ${incoming.type} v${incoming.version || 1} (${incoming.status})`,
    })

    const checklist = Array.isArray(doc.documentChecklist) ? [...doc.documentChecklist] : defaultChecklist()
    const cat = String(incoming.type || '')
    const ci = checklist.findIndex((c) =>
      String(c.category || '')
        .toLowerCase()
        .includes(cat.toLowerCase().slice(0, 8)),
    )
    if (ci >= 0 && incoming.status === 'Verified') {
      checklist[ci] = { ...checklist[ci], state: 'Uploaded' }
    }

    const data = await ExportDocs()
      .findOneAndUpdate(
        { $and: [tenantFilter(tid), { invoiceNo }] },
        {
          $set: {
            documents: docs,
            timeline,
            documentChecklist: checklist,
            docStatus: docs.some((d) => d.status === 'Needs Correction')
              ? 'Needs correction'
              : docs.length
                ? 'In progress'
                : doc.docStatus || 'Draft',
          },
        },
        { new: true },
      )
      .lean()

    res.json({ success: true, data, message: 'Document saved (version kept if replaced)' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

/** POST /api/export_docs/actions/generate-pdf  body: { invoiceNo, kind: commercial|packing } */
export async function generatePdf(req, res) {
  try {
    const tid = tenantIdOf(req)
    const invoiceNo = String(req.body?.invoiceNo || '').trim()
    const kind = String(req.body?.kind || 'commercial').toLowerCase()
    if (!invoiceNo) {
      return res.status(400).json({ success: false, message: 'invoiceNo required' })
    }

    const doc = await ExportDocs()
      .findOne({ $and: [tenantFilter(tid), { invoiceNo }] })
      .lean()
    if (!doc) return res.status(404).json({ success: false, message: 'Export doc not found' })

    let transfer = null
    if (doc.stockTransferId) {
      transfer = await Transfers()
        .findOne({ $and: [tenantFilter(tid), { shipmentId: String(doc.stockTransferId) }] })
        .lean()
    }

    const lines =
      Array.isArray(doc.lineItems) && doc.lineItems.length
        ? doc.lineItems
        : Array.isArray(transfer?.items)
          ? transfer.items
          : []

    const packages = Array.isArray(transfer?.packages) ? transfer.packages : []
    const title = kind === 'packing' ? 'Packing List' : 'Commercial Invoice'
    const totalQty = lines.reduce((s, l) => s + Number(l.qty || 0), 0)
    const totalValue = lines.reduce(
      (s, l) => s + Number(l.qty || 0) * Number(l.unitValueUsd || 0),
      0,
    )

    const rowsHtml = lines
      .map(
        (l, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(l.sku || '')}</td>
        <td>${escapeHtml(l.title || '')}</td>
        <td>${escapeHtml(l.hsn || doc.hsn || '')}</td>
        <td style="text-align:right">${Number(l.qty || 0)}</td>
        ${
          kind === 'packing'
            ? ''
            : `<td style="text-align:right">$${Number(l.unitValueUsd || 0).toFixed(2)}</td>
               <td style="text-align:right">$${(Number(l.qty || 0) * Number(l.unitValueUsd || 0)).toFixed(2)}</td>`
        }
      </tr>`,
      )
      .join('')

    const pkgHtml = packages
      .map(
        (p) =>
          `<tr><td>${escapeHtml(p.packageId || '')}</td><td>${p.lengthCm || ''}×${p.widthCm || ''}×${p.heightCm || ''} cm</td><td>${p.grossKg || ''} kg</td><td>${p.cbm || ''} CBM</td></tr>`,
      )
      .join('')

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${title} ${escapeHtml(invoiceNo)}</title>
<style>
  body{font-family:Georgia,serif;color:#111;margin:32px;font-size:13px}
  h1{font-size:22px;margin:0 0 4px}
  .meta{color:#444;margin-bottom:18px}
  table{width:100%;border-collapse:collapse;margin-top:12px}
  th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
  th{background:#f4f4f4}
  .foot{margin-top:24px;font-size:11px;color:#666}
  @media print{button{display:none}}
</style></head><body>
  <button onclick="window.print()">Print / Save PDF</button>
  <h1>${title}</h1>
  <div class="meta">
    <div><strong>Invoice:</strong> ${escapeHtml(invoiceNo)} &nbsp;|&nbsp; <strong>Date:</strong> ${escapeHtml(doc.date || '')}</div>
    <div><strong>Export Shipment ID:</strong> ${escapeHtml(doc.exportShipmentId || '')}</div>
    <div><strong>Stock Transfer:</strong> ${escapeHtml(doc.stockTransferId || '')}</div>
    <div><strong>Consignee:</strong> ${escapeHtml(doc.consignee || '')} → ${escapeHtml(doc.destination || '')}</div>
    <div><strong>Incoterms:</strong> ${escapeHtml(doc.incoterms || '')} &nbsp;|&nbsp; <strong>BL/AWB:</strong> ${escapeHtml(doc.blNumber || '')} &nbsp;|&nbsp; <strong>Container:</strong> ${escapeHtml(doc.containerNo || '')}</div>
    <div><strong>Vessel/Voyage:</strong> ${escapeHtml(doc.vesselVoyage || '')} &nbsp;|&nbsp; POL ${escapeHtml(doc.pol || '')} → POD ${escapeHtml(doc.pod || '')}</div>
  </div>
  <table>
    <thead><tr>
      <th>#</th><th>SKU</th><th>Description</th><th>HSN</th><th>Qty</th>
      ${kind === 'packing' ? '' : '<th>Unit USD</th><th>Amount USD</th>'}
    </tr></thead>
    <tbody>${rowsHtml || '<tr><td colspan="7">No line items — link a Stock Transfer with rugs.</td></tr>'}</tbody>
  </table>
  <p><strong>Total qty:</strong> ${totalQty}${kind === 'packing' ? '' : ` &nbsp;|&nbsp; <strong>Total value:</strong> $${totalValue.toFixed(2)}`}</p>
  ${
    kind === 'packing' && packages.length
      ? `<h3>Packages / rolls</h3><table><thead><tr><th>Package</th><th>Dims</th><th>Gross</th><th>CBM</th></tr></thead><tbody>${pkgHtml}</tbody></table>`
      : ''
  }
  <div class="foot">Generated by RugOS · ${new Date().toISOString()} · Use browser Print → Save as PDF. Not a signed legal instrument until verified.</div>
</body></html>`

    const timeline = Array.isArray(doc.timeline) ? [...doc.timeline] : []
    timeline.push({
      id: `ev-${Date.now()}`,
      at: new Date().toISOString(),
      by: req.user?.email || 'system',
      note: `Generated ${title}`,
    })
    await ExportDocs().findOneAndUpdate(
      { $and: [tenantFilter(tid), { invoiceNo }] },
      {
        $set: {
          timeline,
          lastGenerated: { kind, at: new Date().toISOString() },
          docStatus: doc.docStatus === 'Draft' ? 'In progress' : doc.docStatus,
        },
      },
    )

    res.json({
      success: true,
      kind,
      invoiceNo,
      html,
      message: `${title} ready — open print view to save PDF`,
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
