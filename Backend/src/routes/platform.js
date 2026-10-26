import { Router } from 'express'
import {
  createTenant,
  getMyTenant,
  listTenants,
  updateTenantBilling,
} from '../controllers/platformController.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)
router.get('/tenants', listTenants)
router.post('/tenants', createTenant)
router.get('/tenant/me', getMyTenant)
router.patch('/tenants/:tenantId', updateTenantBilling)

export default router
