import mongoose from 'mongoose'

const mongoUri =
  'mongodb://admin:pass@mongo-primary:27017,mongo-secondary-1:27017,mongo-secondary-2:27017/?replicaSet=rs0'

const connectToMongo = async () => {
  try {
    await mongoose.connect(mongoUri, {
      dbName: 'tasks_db',
      writeConcern: {
        w: 'majority',
        j: true,
        wtimeout: 5000,
      },
    })

    console.log('Connected to MongoDB successful')
  } catch (err) {
    console.error('MongoDB connection error:', err)
    process.exit(1)
  }
}

export default connectToMongo
