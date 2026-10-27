import dotenv from 'dotenv'
import express from 'express'
import mongoose from 'mongoose'
import morgan from 'morgan'
import path from 'path'
import { fileURLToPath } from 'url'
import { connectDB } from './config/db.js'
import { fromBuySheet } from './controllers/buySheetController.js'
import {
  createResource,
  deleteResource,
  getResource,
  listResource,
  updateResource,
} from './controllers/resourceController.js'
import { authenticate, requirePermission } from './middleware/auth.js'
import { requireActiveBilling } from './middleware/billing.js'
import {
  apiRateLimiter,
  authRateLimiter,
  buildCors,
  buildHelmet,
} from './middleware/security.js'
import authRoutes from './routes/auth.js'
import integrationsRoutes from './routes/integrations.js'
import packingRoutes from './routes/packing.js'
import platformRoutes from './routes/platform.js'
import resourceRoutes from './routes/resources.js'
import shippingRoutes from './routes/shipping.js'
import { RESOURCES } from './resources.js'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 5000
const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rugos_erp'

app.set('trust proxy', 1)
app.use(buildHelmet())
app.use(buildCors())
app.post(
  '/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res, next) => {
    try {
      const { webhookStripe } = await import('./controllers/integrationsController.js')
      return webhookStripe(req, res)
    } catch (err) {
      next(err)
    }
  },
)
app.use(express.json({ limit: '8mb' }))
app.post('/api/webhooks/razorpay', async (req, res, next) => {
  try {
    const { webhookRazorpay } = await import('./controllers/integrationsController.js')
    return webhookRazorpay(req, res)
  } catch (err) {
    next(err)
  }
})
app.use(morgan('dev'))
app.use('/api/', apiRateLimiter())

// Local label / packing photo files (sandbox storage — swap for S3 in prod)
app.use(
  '/uploads',
  express.static(path.resolve(__dirname, '../uploads'), {
    maxAge: '1h',
    fallthrough: true,
  }),
)

function healthPayload() {
  return {
    success: true,
    service: 'rugos-backend',
    database: mongoose.connection?.name || null,
    readyState: mongoose.connection?.readyState,
    resources: Object.keys(RESOURCES).length,
    auth: process.env.AUTH_DISABLED === 'true' ? 'disabled' : 'required',
    security: {
      helmet: true,
      rateLimit: true,
      cors: process.env.CORS_ORIGINS ? 'locked' : 'reflect',
    },
    time: new Date().toISOString(),
  }
}

app.get('/', (_req, res) => {
  res.json({
    ...healthPayload(),
    message: 'RugOS API is running',
    docs: '/api/health',
  })
})
app.head('/', (_req, res) => res.status(200).end())

app.get('/api/health', (_req, res) => {
  res.json(healthPayload())
})

app.use('/api/auth', authRateLimiter(), authRoutes)
app.use('/api/platform', platformRoutes)
app.use('/api/integrations', integrationsRoutes)
app.use('/api/shipping', shippingRoutes)
app.use('/api/packing', packingRoutes)

app.post(
  '/api/purchase_orders/from-buy-sheet',
  authenticate,
  requireActiveBilling,
  requirePermission('purchase_orders', 'write'),
  fromBuySheet,
)

app.use('/api/resources', authenticate, requireActiveBilling, resourceRoutes)

for (const name of Object.keys(RESOURCES)) {
  if (name === 'tenants' || name === 'integration_credentials') continue
  const r = express.Router()
  r.use(authenticate)
  r.use(requireActiveBilling)
  r.get('/', requirePermission(name, 'read'), listResource(name))
  r.post('/', requirePermission(name, 'write'), createResource(name))
  r.get('/:recordId', requirePermission(name, 'read'), getResource(name))
  r.put('/:recordId', requirePermission(name, 'write'), updateResource(name))
  r.delete('/:recordId', requirePermission(name, 'write'), deleteResource(name))
  app.use(`/api/${name}`, r)
}

app.use((err, _req, res, _next) => {
  console.error(err)
  const status = err.message?.startsWith('CORS') ? 403 : 500
  res.status(status).json({ success: false, message: err.message || 'Server error' })
})

async function start() {
  await connectDB(MONGODB_URI)
  app.listen(PORT, () => {
    console.log(`RugOS API listening on http://localhost:${PORT}`)
    console.log(`Auth: ${process.env.AUTH_DISABLED === 'true' ? 'DISABLED' : 'JWT required'}`)
    console.log(`Resources: ${Object.keys(RESOURCES).join(', ')}`)
  })
}

start().catch((err) => {
  console.error('Failed to start server:', err.message)
  process.exit(1)
})
