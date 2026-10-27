import { Router } from 'express'
import {
  connectChannel,
  createCheckout,
  disconnectChannel,
  listConnections,
  syncChannel,
  testChannel,
} from '../controllers/integrationsController.js'
import { authenticate, requirePermission } from '../middleware/auth.js'
import { requireActiveBilling, requireModule } from '../middleware/billing.js'

const router = Router()

router.use(authenticate)
router.use(requireActiveBilling)
router.use(requireModule('integrations'))

router.get('/', requirePermission('integration_workers', 'read'), listConnections)
router.post('/:channel/connect', requirePermission('integration_workers', 'write'), connectChannel)
router.post('/:channel/disconnect', requirePermission('integration_workers', 'write'), disconnectChannel)
router.post('/:channel/test', requirePermission('integration_workers', 'read'), testChannel)
router.post('/:channel/sync', requirePermission('integration_workers', 'write'), syncChannel)
router.post('/:channel/checkout', requirePermission('integration_workers', 'write'), createCheckout)

export default router
