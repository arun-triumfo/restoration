import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { connectDB } from '../config/db.js'
import { getResourceModel } from '../models/createResourceModel.js'
import { RESOURCES } from '../resources.js'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rugos_erp'
const dataDir = path.join(__dirname, 'data')

async function seed() {
  await connectDB(MONGODB_URI)

  const summary = []
  for (const [name, meta] of Object.entries(RESOURCES)) {
    const file = path.join(dataDir, `${name}.json`)
    if (!fs.existsSync(file)) {
      summary.push(`${name}: SKIP (no seed file)`)
      continue
    }
    let rows = JSON.parse(fs.readFileSync(file, 'utf8'))
    // Ensure every row has the business id field (esp. sku_history)
    rows = rows.map((row, idx) => {
      if (row[meta.idField]) return row
      return {
        ...row,
        [meta.idField]: row.ref || row.id || `${name}-${idx + 1}`,
      }
    })
    const Model = getResourceModel(name, meta.idField, meta.unique !== false)
    await Model.deleteMany({})
    if (rows.length) await Model.insertMany(rows, { ordered: false })
    summary.push(`${name}: ${rows.length}`)
  }

  console.log('Seed complete:')
  summary.forEach((line) => console.log('  -', line))
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
