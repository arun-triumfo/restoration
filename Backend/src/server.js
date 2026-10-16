import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import mongoose from 'mongoose'
import morgan from 'morgan'
import { connectDB } from './config/db.js'
import {
  createResource,
  deleteResource,
  getResource,
  listResource,
  updateResource,
} from './controllers/resourceController.js'
import resourceRoutes from './routes/resources.js'
import { RESOURCES } from './resources.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000
const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rugos_erp'

app.use(cors({ origin: true }))
app.use(express.json({ limit: '5mb' }))
app.use(morgan('dev'))

function healthPayload() {
  return {
    success: true,
    service: 'rugos-backend',
    database: mongoose.connection?.name || null,
    readyState: mongoose.connection?.readyState,
    resources: Object.keys(RESOURCES).length,
    time: new Date().toISOString(),
  }
}

// Root + health (Render probes often hit /)
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

// Catalog of all resources
app.use('/api/resources', resourceRoutes)

// Mount each resource at /api/<name> for clean REST paths
for (const name of Object.keys(RESOURCES)) {
  const r = express.Router()
  r.get('/', listResource(name))
  r.post('/', createResource(name))
  r.get('/:recordId', getResource(name))
  r.put('/:recordId', updateResource(name))
  r.delete('/:recordId', deleteResource(name))
  app.use(`/api/${name}`, r)
}

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ success: false, message: err.message || 'Server error' })
})

async function start() {
  await connectDB(MONGODB_URI)
  app.listen(PORT, () => {
    console.log(`RugOS API listening on http://localhost:${PORT}`)
    console.log(`Resources: ${Object.keys(RESOURCES).join(', ')}`)
  })
}

start().catch((err) => {
  console.error('Failed to start server:', err.message)
  process.exit(1)
})
