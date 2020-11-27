require('dotenv').config()

const path = require('path')
const assert = require('assert')
const Koa = require('koa')
const Router = require('@koa/router')
const bodyParser = require('koa-bodyparser')
const koaStatic = require('koa-static')
const MongoClient = require('mongodb').MongoClient
const ObjectID = require('mongodb').ObjectID
const admin = require('firebase-admin')
const jwt = require('jsonwebtoken')
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
    topic: 'sensor_' + id,
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
const ADMIN_USERNAME = process.env.ADMIN_USERNAME
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
const APP_SECRET = process.env.APP_SECRET

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

router.post('/device/add', async (ctx) => {
  if (!ctx.auth.admin) return ctx.throw(403)

  const deviceCollection = ctx.db.collection('devices')

  const name = ctx.request.body.name
  const description = ctx.request.body.description
  const secretKey = ctx.request.body.secret_key

  if (
    !name ||
    !description ||
    !secretKey
  ) {
    ctx.body = 'Parameter Invalid'
    ctx.status = 400
    return null
  }

  await deviceCollection.insertOne({
    name,
    description,
    secret_key: secretKey
  })

  ctx.body = 'OK'
  ctx.status = 200
})

router.put('/device/:id', async (ctx) => {
  if (!ctx.auth.admin) return ctx.throw(403)

  const deviceCollection = ctx.db.collection('devices')

  if (!ObjectID.isValid(ctx.params.id)) {
    ctx.body = 'ID Invalid'
    ctx.status = 400
    return null
  }

  const id = ObjectID(ctx.params.id)
  const name = ctx.request.body.name
  const description = ctx.request.body.description
  const secretKey = ctx.request.body.secret_key

  if (
    !name ||
    !description ||
    !secretKey
  ) {
    ctx.body = 'Parameter Invalid'
    ctx.status = 400
    return null
  }

  await deviceCollection.findOneAndUpdate({ _id: id }, {
    $set: {
      name,
      description,
      secret_key: secretKey
    }
  })

  ctx.body = 'OK'
  ctx.status = 200
})

router.delete('/device/:id', async (ctx) => {
  if (!ctx.auth.admin) return ctx.throw(403)

  const deviceCollection = ctx.db.collection('devices')

  if (!ObjectID.isValid(ctx.params.id)) {
    ctx.body = 'ID Invalid'
    ctx.status = 400
    return null
  }

  const id = ObjectID(ctx.params.id)
  await deviceCollection.findOneAndDelete({ _id: id })

  ctx.body = 'OK'
  ctx.status = 200
})

router.get('/device/list', async (ctx) => {
  const params = {}
  const deviceCollection = ctx.db.collection('devices')

  if (ctx.query.ids && ctx.query.ids.length) {
    params._id = { $in: ctx.query.ids.map(r => ObjectID(r)) }
  }

  if (ctx.query.search) {
    params.$or = [
      { name: RegExp(ctx.query.search, 'i') },
      { description: RegExp(ctx.query.search, 'i') }
    ]
  }

  const res = await deviceCollection.find(params).toArray()
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
    recorded_at: new Date()
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

router.post('/admin/login', async (ctx) => {
  const { username, password } = ctx.request.body

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    ctx.body = 'Invalid Credentials'
    ctx.status = 422
    return null
  }

  ctx.body = jwt.sign({ admin: 1 }, APP_SECRET)
  ctx.status = 200
})

app.use(async (ctx, next) => {
  if (ctx.request.headers.authorization) {
    const [scheme, token] = ctx.request.headers.authorization.split(' ')

    if (scheme === 'Bearer') {
      try {
        const decoded = jwt.verify(token, APP_SECRET)
        ctx.auth = decoded
      } catch (err) {
        return ctx.throw(401)
      }
    }
  }

  await next()
})

app.use(bodyParser())
app.use(router.routes())
app.use(router.allowedMethods())
app.use(koaStatic(path.resolve(__dirname, '../admin/dist')))

app.listen(PORT, HOST, () => {
  console.log(`Server listening at port ${HOST}:${PORT}`)
})
