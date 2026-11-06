import { Router } from 'express'
import {
  activateTenant,
  createDemoRequest,
  createTenant,
  getMyTenant,
  listDemoRequests,
  listPublicPlans,
  listTenants,
  createSubscriptionCheckout,
  requestSubscription,
  saasOverview,
  verifySubscriptionPayment,
  suspendTenant,
  updateDemoRequest,
  updateTenantBilling,
} from '../controllers/platformController.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

/** Public SaaS marketing APIs */
router.get('/plans', listPublicPlans)
router.post('/subscribe', requestSubscription)
router.post('/checkout', createSubscriptionCheckout)
router.post('/checkout/verify', verifySubscriptionPayment)
router.post('/demo-requests', createDemoRequest)

router.use(authenticate)
router.get('/overview', saasOverview)
router.get('/tenants', listTenants)
router.post('/tenants', createTenant)
router.get('/tenant/me', getMyTenant)
router.patch('/tenants/:tenantId', updateTenantBilling)
router.post('/tenants/:tenantId/activate', activateTenant)
router.post('/tenants/:tenantId/suspend', suspendTenant)
router.get('/demo-requests', listDemoRequests)
router.patch('/demo-requests/:id', updateDemoRequest)

export default router
