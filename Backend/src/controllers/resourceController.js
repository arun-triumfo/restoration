import { RESOURCES } from '../resources.js'
import { getResourceModel } from '../models/createResourceModel.js'

function modelFor(resource) {
  const meta = RESOURCES[resource]
  return getResourceModel(resource, meta.idField, meta.unique !== false)
}

function recordId(req) {
  return req.params.recordId ?? req.params.id
}

export function listResource(resource) {
  return async (req, res) => {
    try {
      const { search = '' } = req.query
      const Model = modelFor(resource)
      let filter = {}
      if (search) {
        const q = String(search).trim()
        filter = {
          $or: [
            { [RESOURCES[resource].idField]: new RegExp(q, 'i') },
            { title: new RegExp(q, 'i') },
            { name: new RegExp(q, 'i') },
            { status: new RegExp(q, 'i') },
            { buyerName: new RegExp(q, 'i') },
            { channel: new RegExp(q, 'i') },
          ],
        }
      }
      const data = await Model.find(filter).sort({ updatedAt: -1 }).lean()
      res.json({ success: true, resource, count: data.length, data })
    } catch (err) {
      res.status(500).json({ success: false, message: err.message })
    }
  }
}

export function getResource(resource) {
  return async (req, res) => {
    try {
      const idField = RESOURCES[resource].idField
      const id = recordId(req)
      if (!id) {
        return res.status(400).json({ success: false, message: 'Record id required' })
      }
      const Model = modelFor(resource)
      const data = await Model.findOne({ [idField]: id }).lean()
      if (!data) return res.status(404).json({ success: false, message: 'Not found' })
      res.json({ success: true, data })
    } catch (err) {
      res.status(500).json({ success: false, message: err.message })
    }
  }
}

export function createResource(resource) {
  return async (req, res) => {
    try {
      const idField = RESOURCES[resource].idField
      const Model = modelFor(resource)
      const payload = req.body || {}
      const key = payload[idField]
      if (key === undefined || key === null || key === '') {
        return res.status(400).json({ success: false, message: `${idField} is required` })
      }
      const exists = await Model.findOne({ [idField]: key })
      if (exists) {
        return res.status(409).json({ success: false, message: 'Record already exists' })
      }
      const created = await Model.create(payload)
      res.status(201).json({ success: true, data: created })
    } catch (err) {
      res.status(500).json({ success: false, message: err.message })
    }
  }
}

export function updateResource(resource) {
  return async (req, res) => {
    try {
      const idField = RESOURCES[resource].idField
      const id = recordId(req)
      if (!id) {
        return res.status(400).json({ success: false, message: 'Record id required' })
      }
      const Model = modelFor(resource)
      const body = { ...(req.body || {}) }
      delete body._id
      delete body.__v
      delete body.createdAt
      delete body.updatedAt
      // Never allow business key rewrite via body on update URL
      if (body[idField] !== undefined && String(body[idField]) !== String(id)) {
        delete body[idField]
      }
      const updated = await Model.findOneAndUpdate(
        { [idField]: id },
        { $set: body },
        { new: true },
      )
      if (!updated) return res.status(404).json({ success: false, message: 'Not found' })
      res.json({ success: true, data: updated })
    } catch (err) {
      res.status(500).json({ success: false, message: err.message })
    }
  }
}

export function deleteResource(resource) {
  return async (req, res) => {
    try {
      const idField = RESOURCES[resource].idField
      const id = recordId(req)
      if (!id) {
        return res.status(400).json({ success: false, message: 'Record id required' })
      }
      const Model = modelFor(resource)
      const deleted = await Model.findOneAndDelete({ [idField]: id })
      if (!deleted) return res.status(404).json({ success: false, message: 'Not found' })
      res.json({ success: true, message: 'Deleted', data: deleted })
    } catch (err) {
      res.status(500).json({ success: false, message: err.message })
    }
  }
}
