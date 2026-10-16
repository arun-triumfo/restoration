import { Router } from 'express'
import {
  createResource,
  deleteResource,
  getResource,
  listResource,
  updateResource,
} from '../controllers/resourceController.js'
import { isValidResource, RESOURCES } from '../resources.js'

const router = Router()

router.get('/', (_req, res) => {
  res.json({
    success: true,
    resources: Object.entries(RESOURCES).map(([key, meta]) => ({
      key,
      idField: meta.idField,
      label: meta.label,
      path: `/api/${key}`,
    })),
  })
})

router.param('resource', (req, res, next, resource) => {
  if (!isValidResource(resource)) {
    return res.status(404).json({ success: false, message: `Unknown resource: ${resource}` })
  }
  req.resourceName = resource
  next()
})

router.get('/:resource', (req, res, next) => listResource(req.resourceName)(req, res, next))
router.post('/:resource', (req, res, next) => createResource(req.resourceName)(req, res, next))
router.get('/:resource/:recordId', (req, res, next) => getResource(req.resourceName)(req, res, next))
router.put('/:resource/:recordId', (req, res, next) => updateResource(req.resourceName)(req, res, next))
router.delete('/:resource/:recordId', (req, res, next) =>
  deleteResource(req.resourceName)(req, res, next),
)

export default router
