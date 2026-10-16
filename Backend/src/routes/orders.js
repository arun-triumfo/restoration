import { Router } from 'express'
import {
  createOrder,
  deleteOrder,
  getOrder,
  listOrders,
  updateOrder,
} from '../controllers/orderController.js'

const router = Router()

router.get('/', listOrders)
router.get('/:orderId', getOrder)
router.post('/', createOrder)
router.put('/:orderId', updateOrder)
router.delete('/:orderId', deleteOrder)

export default router
