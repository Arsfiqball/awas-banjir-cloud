const MongoClient = require('mongodb').MongoClient

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017'
const MONGO_DB = process.env.MONGO_DB || 'awasbanjir'

exports.createConnection = async () => {
  const client = await MongoClient.connect(MONGO_URL, { native_parser: true, useUnifiedTopology: true })
  return client.db(MONGO_DB)
}

exports.setup = (app) => {
  MongoClient
    .connect(MONGO_URL, { native_parser: true, useUnifiedTopology: true })
    .then(client => {
      app.context.db = client.db(MONGO_DB)

      app.context.db
        .collection('records_origin')
        .createIndex({ recorded_at: 1 }, { expireAfterSeconds: 3600 })

      app.context.db
        .collection('records_perhour')
        .createIndex({ recorded_at: 1 }, { expireAfterSeconds: 3600 * 24 * 14 })
    })
    .catch(console.error)
}
