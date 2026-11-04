/**
 * Fill rack / bin locations on existing SKUs if empty.
 * Does not overwrite locations already set.
 */
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { connectDB } from '../config/db.js'
import { Sku } from '../models/Sku.js'

dotenv.config()

function locFor(index, wh) {
  const aisle = String((index % 6) + 1).padStart(2, '0')
  const rack = `R-${String((index % 12) + 1).padStart(2, '0')}`
  const bin = `B-${String((index % 8) + 1).padStart(2, '0')}`
  if (wh === 'india') {
    return { zone: index % 2 === 0 ? 'A' : 'B', aisle, rack, bin, note: 'India floor pick', photoUrl: '' }
  }
  return { zone: index % 2 === 0 ? 'C' : 'D', aisle, rack, bin, note: 'US floor pick', photoUrl: '' }
}

async function main() {
  await connectDB(process.env.MONGODB_URI)
  const skus = await Sku.find({}).lean()
  let patched = 0
  for (let i = 0; i < skus.length; i++) {
    const sku = skus[i]
    const loc = sku.locations || {}
    const india = loc.india || {}
    const usa = loc.usa || {}
    const needIndia = !india.rack && !india.bin
    const needUsa = !usa.rack && !usa.bin
    if (!needIndia && !needUsa) continue
    await Sku.updateOne(
      { sku: sku.sku },
      {
        $set: {
          locations: {
            india: needIndia ? locFor(i, 'india') : india,
            usa: needUsa ? locFor(i + 3, 'usa') : usa,
          },
        },
      },
    )
    patched += 1
    console.log('located', sku.sku)
  }
  console.log(`Patched ${patched} of ${skus.length} SKUs`)
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
