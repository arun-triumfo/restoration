import { Sku } from '../models/Sku.js'

export async function listSkus(req, res) {
  try {
    const { search = '', collection = '' } = req.query
    const filter = {}

    if (collection && collection !== 'all') {
      filter.collection = collection
    }

    if (search) {
      const q = String(search).trim()
      filter.$or = [
        { sku: new RegExp(q, 'i') },
        { title: new RegExp(q, 'i') },
        { material: new RegExp(q, 'i') },
        { construction: new RegExp(q, 'i') },
        { barcode: new RegExp(q, 'i') },
        { collection: new RegExp(q, 'i') },
      ]
    }

    const skus = await Sku.find(filter).sort({ createdAt: -1 }).lean()
    res.json({ success: true, count: skus.length, data: skus })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function getSku(req, res) {
  try {
    const sku = await Sku.findOne({ sku: req.params.sku }).lean()
    if (!sku) return res.status(404).json({ success: false, message: 'SKU not found' })
    res.json({ success: true, data: sku })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function createSku(req, res) {
  try {
    const payload = req.body
    if (!payload?.sku || !payload?.title) {
      return res.status(400).json({ success: false, message: 'sku and title are required' })
    }

    const exists = await Sku.findOne({ sku: payload.sku })
    if (exists) {
      return res.status(409).json({ success: false, message: `SKU ${payload.sku} already exists` })
    }

    const created = await Sku.create(payload)
    res.status(201).json({ success: true, data: created })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function updateSku(req, res) {
  try {
    const updated = await Sku.findOneAndUpdate(
      { sku: req.params.sku },
      { $set: req.body },
      { new: true, runValidators: true },
    )
    if (!updated) return res.status(404).json({ success: false, message: 'SKU not found' })
    res.json({ success: true, data: updated })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function deleteSku(req, res) {
  try {
    const deleted = await Sku.findOneAndDelete({ sku: req.params.sku })
    if (!deleted) return res.status(404).json({ success: false, message: 'SKU not found' })
    res.json({ success: true, message: `SKU ${req.params.sku} deleted`, data: deleted })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
