import mongoose from 'mongoose'

const stockSchema = new mongoose.Schema(
  {
    indiaAvailable: { type: Number, default: 0 },
    indiaPacked: { type: Number, default: 0 },
    inTransit: { type: Number, default: 0 },
    usaAvailable: { type: Number, default: 0 },
    usaReserved: { type: Number, default: 0 },
    fba: { type: Number, default: 0 },
  },
  { _id: false },
)

const mappingsSchema = new mongoose.Schema(
  {
    amazon: String,
    etsy: String,
    walmart: String,
    b2b: String,
    shopify: String,
  },
  { _id: false },
)

const skuSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, unique: true, trim: true },
    odetteSku: String,
    title: { type: String, required: true },
    collection: String,
    design: String,
    material: String,
    construction: String,
    size: String,
    shape: String,
    pileHeight: String,
    knotDensity: String,
    gsm: Number,
    weightKg: Number,
    sellingPriceUSD: Number,
    mfgCostINR: Number,
    mfgCostUSD: Number,
    packingCostUSD: Number,
    allocatedLandedFreightUSD: Number,
    stock: { type: stockSchema, default: () => ({}) },
    mappings: { type: mappingsSchema, default: () => ({}) },
    barcode: String,
    imageUrl: String,
  },
  { timestamps: true, suppressReservedKeysWarning: true },
)

skuSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    delete ret.__v
    return ret
  },
})

export const Sku = mongoose.model('Sku', skuSchema)
