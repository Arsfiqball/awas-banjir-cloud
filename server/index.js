require('dotenv').config()

const assert = require('assert')
const Koa = require('koa')
const Router = require('@koa/router')
const MongoClient = require('mongodb').MongoClient
const ObjectID = require('mongodb').ObjectID
const admin = require('firebase-admin')
const serviceAccount = require('./fcm-key.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://arsfiqball-awas-banjir.firebaseio.com'
})

function transWaterLevel (n) {
  if (n === 1) return 'Normal'
  if (n === 2) return 'Siaga'
  if (n === 3) return 'Waspada'
  if (n === 4) return 'Bahaya'
  return '???'
}

function isNumeric(str) {
  return !isNaN(str) && !isNaN(parseFloat(str))
}

function sendNotification ({ id, title, body }) {
  message = {
    topic: 'all_sensors',
    notification: {
      body,
      title,
    },
    android: {
      // collapseKey: 'ALL_SENSORS',
      notification: {
        sound: 'default',
        tag: 'sensor_' + id,
        defaultSound: true,
        defaultVibrateTimings: true,
        // eventTimestamp: Date.now(),
        defaultLightSettings: true,
        clickAction: 'FLUTTER_NOTIFICATION_CLICK'
      }
    },
    data: {
      id
    }
  }

  return admin.messaging().send(message)
}

const HOST = process.env.HOST || '0.0.0.0'
const PORT = process.env.PORT || 8080
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017'
const MONGO_DB = process.env.MONGO_DB || 'awasbanjir'

const app = new Koa()
const router = new Router()

MongoClient
  .connect(MONGO_URL, { native_parser: true, useUnifiedTopology: true })
  .then(client => {
    app.context.db = client.db(MONGO_DB)

    app.context.db
      .collection('records_origin')
      .createIndex({ recorded_at: 1 }, { expireAfterSeconds: 3600 })
  })
  .catch(console.error)

router.get('/device/list', async (ctx) => {
  const deviceCollection = ctx.db.collection('devices')
  const res = await deviceCollection.find().toArray()
  ctx.body = res
  ctx.status = 200
})

router.get('/device/:id/logs', async (ctx) => {
  const deviceCollection = ctx.db.collection('devices')
  const recordCollection = ctx.db.collection('records_origin')

  if (!ObjectID.isValid(ctx.params.id)) {
    ctx.body = 'ID Invalid'
    ctx.status = 400
    return null
  }

  const id = ObjectID(ctx.params.id)

  const res = await deviceCollection.findOne({ _id: id })

  res.records = await recordCollection
    .find({ device_id: id })
    .limit(20)
    .sort('_id', -1)
    .project({
      _id: 1,
      ultrasonic: 1,
      waterlevel: 1,
      power: 1,
      recorded_at: 1
    })
    .toArray()

  ctx.body = res
  ctx.status = 200
})

router.get('/device/:id/write', async (ctx) => {
  if (!ObjectID.isValid(ctx.params.id)) {
    ctx.body = 'ID Invalid'
    ctx.status = 400
    return null
  }

  if (
    !isNumeric(ctx.query.ultrasonic) ||
    !isNumeric(ctx.query.waterlevel) ||
    !isNumeric(ctx.query.power)
  ) {
    ctx.body = 'Parameter Invalid'
    ctx.status = 400
    return null
  }

  const deviceCollection = ctx.db.collection('devices')
  const recordCollection = ctx.db.collection('records_origin')

  const id = ObjectID(ctx.params.id)

  const record = {
    ultrasonic: Number(ctx.query.ultrasonic),
    waterlevel: Number(ctx.query.waterlevel),
    power: Number(ctx.query.power),
    recorded_at: Date.now()
  }

  const device = await deviceCollection.findOneAndUpdate({ _id: id }, {
    $set: {
      last_recorded: record
    }
  })

  if (!device.value) {
    ctx.body = 'Server can not update data of device with ID: ' + id
    ctx.status = 500
    return null
  }

  const savedRecord = await recordCollection.insertOne({
    device_id: id,
    ...record
  })

  if (['1', 1, 'yes', 'true', 'ok'].includes(ctx.query.notify)) {
    await sendNotification({
      title: device.value.name,
      body: `Status: ${transWaterLevel(record.waterlevel)}, Tinggi air: ${record.ultrasonic} cm`,
      id: id.toString()
    })
  }

  ctx.body = 'OK'
  ctx.status = 200
})

app.use(router.routes())
app.use(router.allowedMethods())

app.listen(PORT, HOST, () => {
  console.log(`Server listening at port ${HOST}:${PORT}`)
})
