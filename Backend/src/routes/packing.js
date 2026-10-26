import { Router } from 'express'
import {
  confirmPack,
  listPackingQueue,
  requireWarehouseRole,
} from '../controllers/packingController.js'
import { authenticate, requirePermission } from '../middleware/auth.js'
import { requireActiveBilling } from '../middleware/billing.js'

const router = Router()

router.use(authenticate)
router.use(requireActiveBilling)
router.use(requireWarehouseRole)

router.get('/queue', requirePermission('orders', 'read'), listPackingQueue)
router.post('/confirm', requirePermission('orders', 'write'), confirmPack)

export default router
