import { Order } from '../models/Order.js'

export async function listOrders(req, res) {
  try {
    const { search = '', channel = '', status = '' } = req.query
    const filter = {}

    if (channel && channel !== 'all') {
      filter.channel = new RegExp(channel, 'i')
    }
    if (status && status !== 'all') {
      filter.status = new RegExp(status, 'i')
    }
    if (search) {
      const q = String(search).trim()
      filter.$or = [
        { orderId: new RegExp(q, 'i') },
        { buyerName: new RegExp(q, 'i') },
        { sku: new RegExp(q, 'i') },
        { marketplaceOrderId: new RegExp(q, 'i') },
      ]
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 }).lean()
    res.json({ success: true, count: orders.length, data: orders })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function getOrder(req, res) {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId }).lean()
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' })
    res.json({ success: true, data: order })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function createOrder(req, res) {
  try {
    const payload = req.body
    if (!payload?.orderId || !payload?.sku) {
      return res.status(400).json({ success: false, message: 'orderId and sku are required' })
    }

    const exists = await Order.findOne({ orderId: payload.orderId })
    if (exists) {
      return res.status(409).json({ success: false, message: `Order ${payload.orderId} already exists` })
    }

    const created = await Order.create(payload)
    res.status(201).json({ success: true, data: created })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function updateOrder(req, res) {
  try {
    const updated = await Order.findOneAndUpdate(
      { orderId: req.params.orderId },
      { $set: req.body },
      { new: true, runValidators: true },
    )
    if (!updated) return res.status(404).json({ success: false, message: 'Order not found' })
    res.json({ success: true, data: updated })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function deleteOrder(req, res) {
  try {
    const deleted = await Order.findOneAndDelete({ orderId: req.params.orderId })
    if (!deleted) return res.status(404).json({ success: false, message: 'Order not found' })
    res.json({ success: true, message: `Order ${req.params.orderId} deleted`, data: deleted })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
