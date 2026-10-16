import mongoose from 'mongoose'

/**
 * Connect to MongoDB. Database name comes from MONGODB_URI path
 * (e.g. ...mongodb.net/restoration or localhost/rugos_erp).
 */
export async function connectDB(uri) {
  if (!uri) {
    throw new Error(
      'MONGODB_URI is missing. Set it in Render Environment (or Backend/.env).',
    )
  }

  // Block accidental blank / invalid URIs that fall back to nothing useful
  if (uri.includes('127.0.0.1') || uri.includes('localhost')) {
    if (process.env.RENDER || process.env.NODE_ENV === 'production') {
      throw new Error(
        'Refusing localhost MongoDB on Render/production. Set MONGODB_URI to your Atlas connection string.',
      )
    }
  }

  mongoose.set('strictQuery', true)

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
  })

  const dbName = mongoose.connection.name
  console.log(`MongoDB connected → ${dbName}`)
  return dbName
}
