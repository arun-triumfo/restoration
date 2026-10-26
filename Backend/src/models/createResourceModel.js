import mongoose from 'mongoose'

const cache = new Map()

/**
 * Flexible document model per collection (wireframe JSON shape varies).
 * id: false — allow business field `id` to persist (Mongoose virtual would steal it).
 */
export function getResourceModel(resourceName, idField, unique = true) {
  const cacheKey = resourceName
  if (cache.has(cacheKey)) return cache.get(cacheKey)

  const schema = new mongoose.Schema(
    {},
    {
      strict: false,
      strictQuery: false,
      id: false,
      timestamps: true,
      suppressReservedKeysWarning: true,
      collection: resourceName,
    },
  )

  schema.index({ tenantId: 1 })
  if (idField) {
    // Unique per tenant when possible (sparse allows missing keys on legacy rows)
    schema.index({ tenantId: 1, [idField]: 1 }, { unique: !!unique, sparse: true })
  }

  const model =
    mongoose.models[resourceName] ||
    mongoose.model(resourceName, schema)

  cache.set(cacheKey, model)
  return model
}
