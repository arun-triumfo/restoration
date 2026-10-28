import { Router } from 'express'
import {
  buyLabel,
  listShipments,
  orderShippingContext,
  quoteRates,
  trackShipment,
} from '../controllers/shippingController.js'
import { authenticate, requirePermission } from '../middleware/auth.js'
import { requireActiveBilling } from '../middleware/billing.js'

const router = Router()

router.use(authenticate)
router.use(requireActiveBilling)

router.get('/', requirePermission('shipments', 'read'), listShipments)
router.get('/order-context/:orderId', requirePermission('shipments', 'read'), orderShippingContext)
router.post('/rates', requirePermission('shipments', 'read'), quoteRates)
router.post('/labels', requirePermission('shipments', 'write'), buyLabel)
router.get('/track/:awb', requirePermission('shipments', 'read'), trackShipment)
router.post('/track/:awb', requirePermission('shipments', 'read'), trackShipment)

export default router
