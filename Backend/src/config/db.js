import mongoose from 'mongoose'

export async function connectDB(uri) {
  if (!uri || !uri.includes('/rugos_erp')) {
    throw new Error('Refusing to connect: MONGODB_URI must target database rugos_erp only')
  }

  mongoose.set('strictQuery', true)
  await mongoose.connect(uri)
  const dbName = mongoose.connection.name
  if (dbName !== 'rugos_erp') {
    await mongoose.disconnect()
    throw new Error(`Refusing to use database "${dbName}". Expected rugos_erp.`)
  }

  console.log(`MongoDB connected → ${dbName}`)
}
