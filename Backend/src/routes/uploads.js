import { Router } from 'express'
import { authenticate, requirePermission } from '../middleware/auth.js'
import { requireActiveBilling } from '../middleware/billing.js'
import { uploadPhoto } from '../controllers/uploadController.js'

const router = Router()
router.use(authenticate)
router.use(requireActiveBilling)
router.post('/photo', requirePermission('skus', 'write'), uploadPhoto)

export default router
