import { Router } from 'express'
import {
  createSku,
  deleteSku,
  getSku,
  listSkus,
  updateSku,
} from '../controllers/skuController.js'

const router = Router()

router.get('/', listSkus)
router.get('/:sku', getSku)
router.post('/', createSku)
router.put('/:sku', updateSku)
router.delete('/:sku', deleteSku)

export default router
