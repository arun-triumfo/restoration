import mongoose from 'mongoose'

function resolveDbName(uri) {
  // Explicit override (recommended on Render)
  if (process.env.MONGODB_DB) return process.env.MONGODB_DB

  try {
    const parsed = new URL(uri)
    const fromPath = parsed.pathname?.replace(/^\//, '')
    if (fromPath) return fromPath
  } catch {
    // ignore parse errors for non-standard URIs
  }

  // Atlas URI without /dbname defaults to "test" — force our app DB
  if (uri.includes('mongodb+srv://') || uri.includes('mongodb.net')) {
    return 'restoration'
  }

  return undefined
}

/**
 * Connect to MongoDB.
 * Prefer MONGODB_URI with /restoration in the path, or set MONGODB_DB=restoration.
 */
export async function connectDB(uri) {
  if (!uri) {
    throw new Error(
      'MONGODB_URI is missing. Set it in Render Environment (or Backend/.env).',
    )
  }

  if (uri.includes('127.0.0.1') || uri.includes('localhost')) {
    if (process.env.RENDER || process.env.NODE_ENV === 'production') {
      throw new Error(
        'Refusing localhost MongoDB on Render/production. Set MONGODB_URI to your Atlas connection string.',
      )
    }
  }

  mongoose.set('strictQuery', true)

  const dbName = resolveDbName(uri)
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 20000,
    ...(dbName ? { dbName } : {}),
  })

  console.log(`MongoDB connected → ${mongoose.connection.name}`)
  return mongoose.connection.name
}
