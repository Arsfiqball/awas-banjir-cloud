const ObjectID = require('mongodb').ObjectID
const jwt = require('jsonwebtoken')

const isNumeric = (str) => !isNaN(str) && !isNaN(parseFloat(str))
const isOK = (str) => ['1', 1, 'yes', 'y', 'true', true, 'ok'].includes(str)

function transWaterLevel (n) {
  if (n === 1) return 'Normal'
  if (n === 2) return 'Siaga'
  if (n === 3) return 'Waspada'
  if (n === 4) return 'Bahaya'
  return '???'
}

function formatNotification ({ id, name, record }) {
  return {
    topic: 'sensor_' + id.toString(),
    notification: {
      title: name,
      body: `Status: ${transWaterLevel(record.waterlevel)}, Tinggi air: ${record.ultrasonic} cm`
    },
    android: {
      // collapseKey: 'ALL_SENSORS',
      notification: {
        sound: 'default',
        tag: 'sensor_' + id.toString(),
        defaultSound: true,
        defaultVibrateTimings: true,
        // eventTimestamp: Date.now(),
        defaultLightSettings: true,
        clickAction: 'FLUTTER_NOTIFICATION_CLICK'
      }
    },
    data: {
      id: id.toString()
    }
  }
}

exports.create = async (ctx) => {
  if (!ctx.auth.admin) return ctx.throw(403)

  const name = ctx.request.body.name
  const description = ctx.request.body.description
  const secretKey = ctx.request.body.secret_key

  if (!name || !description || !secretKey) return ctx.throw(400)

  await ctx
    .db
    .collection('devices')
    .insertOne({ name, description, secret_key: secretKey })

  ctx.body = 'OK'
  ctx.status = 200
}

exports.update = async (ctx) => {
  if (!ctx.auth.admin) return ctx.throw(403)
  if (!ObjectID.isValid(ctx.params.id)) return ctx.throw(400)

  const id = ObjectID(ctx.params.id)
  const name = ctx.request.body.name
  const description = ctx.request.body.description
  const secretKey = ctx.request.body.secret_key

  if (!name || !description || !secretKey) return ctx.throw(400)

  const $set = { name, description, secret_key: secretKey }

  await ctx
    .db
    .collection('devices')
    .findOneAndUpdate({ _id: id }, { $set })

  ctx.body = 'OK'
  ctx.status = 200
}

exports.remove = async (ctx) => {
  if (!ctx.auth.admin) return ctx.throw(403)
  if (!ObjectID.isValid(ctx.params.id)) return ctx.throw(400)

  await ctx
    .db
    .collection('devices')
    .findOneAndDelete({ _id: ObjectID(ctx.params.id) })

  ctx.body = 'OK'
  ctx.status = 200
}

exports.list = async (ctx) => {
  const params = {}

  if (ctx.query.ids && ctx.query.ids.length) {
    params._id = { $in: ctx.query.ids.map(r => ObjectID(r)) }
  }

  if (ctx.query.search) {
    const regexSearch = RegExp(ctx.query.search, 'i')
    params.$or = [{ name: regexSearch }, { description: regexSearch }]
  }

  const projection = {
    _id: 1,
    name: 1,
    description: 1
  }

  if (ctx.auth && ctx.auth.admin) {
    projection.secret_key = 1
  }

  const res = await ctx
    .db
    .collection('devices')
    .find(params)
    .limit(100)
    .project(projection)
    .toArray()

  ctx.body = res
  ctx.status = 200
}

exports.read = async (ctx) => {
  if (!ObjectID.isValid(ctx.params.id)) return ctx.throw(400)

  const id = ObjectID(ctx.params.id)
  const withLog = isOK(ctx.query.with_log)

  const projection = {
    _id: 1,
    name: 1,
    description: 1
  }

  if (ctx.auth && ctx.auth.admin) {
    projection.secret_key = 1
  }

  const res = await ctx
    .db
    .collection('devices')
    .findOne({ _id: id }, { projection })

  if (withLog) {
    const logMode = ctx.query.log_mode ? ctx.query.log_mode.toString() : 'realtime'

    if (logMode === 'realtime') {
      res.records = await ctx
        .db
        .collection('records_origin')
        .find({ device_id: id })
        .limit(20)
        .sort('_id', -1)
        .project({ _id: 1, ultrasonic: 1, waterlevel: 1, power: 1, recorded_at: 1 })
        .toArray()
    } else if (logMode === '1hour') {
      res.records = await ctx
        .db
        .collection('records_origin')
        .aggregate([{
          $match: {
            device_id: id
          }
        }, {
          $group: {
            _id: { $dateToString: { date: '$recorded_at', format: '%Y-%m-%d %H:%M' } },
            ultrasonic: { $avg: '$ultrasonic' },
            waterlevel: { $avg: '$waterlevel' },
            power: { $avg: '$power' },
            recorded_at: { $max: '$recorded_at' }
          }
        }])
        .limit(60)
        .sort({ _id: -1 })
        .project({ _id: 1, ultrasonic: 1, waterlevel: 1, power: 1, recorded_at: 1 })
        .toArray()

      res.records = res.records.map(r => ({
        _id: r._id,
        ultrasonic: Number(r.ultrasonic.toFixed(2)),
        waterlevel: Number(r.waterlevel.toFixed(0)),
        power: Number(r.power.toFixed(5)),
        recorded_at: r.recorded_at
      }))
    } else if (logMode === '2days') {
      res.records = await ctx
        .db
        .collection('records_perhour')
        .aggregate([{
          $match: {
            device_id: id
          }
        }, {
          $group: {
            _id: { $dateToString: { date: '$recorded_at', format: '%Y-%m-%d %H' } },
            ultrasonic: { $avg: '$ultrasonic' },
            waterlevel: { $avg: '$waterlevel' },
            power: { $avg: '$power' },
            recorded_at: { $max: '$recorded_at' }
          }
        }])
        .limit(48)
        .sort('_id', -1)
        .project({ _id: 1, ultrasonic: 1, waterlevel: 1, power: 1, recorded_at: 1 })
        .toArray()
    } else if (logMode === '2weeks') {
      res.records = await ctx
        .db
        .collection('records_perhour')
        .aggregate([{
          $match: {
            device_id: id
          }
        }, {
          $group: {
            _id: { $dateToString: { date: '$recorded_at', format: '%Y-%m-%d' } },
            ultrasonic: { $avg: '$ultrasonic' },
            waterlevel: { $avg: '$waterlevel' },
            power: { $avg: '$power' },
            recorded_at: { $max: '$recorded_at' }
          }
        }])
        .limit(14)
        .sort({ _id: -1 })
        .project({ _id: 1, ultrasonic: 1, waterlevel: 1, power: 1, recorded_at: 1 })
        .toArray()

      res.records = res.records.map(r => ({
        _id: r._id,
        ultrasonic: Number(r.ultrasonic.toFixed(2)),
        waterlevel: Number(r.waterlevel.toFixed(0)),
        power: Number(r.power.toFixed(5)),
        recorded_at: r.recorded_at
      }))
    }
  }

  ctx.body = res
  ctx.status = 200
}

exports.writeLog = async (ctx) => {
  if (
    !ObjectID.isValid(ctx.params.id) ||
    !isNumeric(ctx.query.ultrasonic) ||
    !isNumeric(ctx.query.waterlevel) ||
    !isNumeric(ctx.query.power) ||
    !ctx.query._token
  ) {
    return ctx.throw(400)
  }

  const id = ObjectID(ctx.params.id)

  let device = await ctx.db.collection('devices').findOne({ _id: id })

  if (!device) return ctx.throw(404)

  try {
    const opts = { algorithms: ['RS256', 'ES256'] }
    const decoded = jwt.verify(ctx.query._token, device.secret_key, opts)
    if (decoded.aud !== ctx.params.id) return ctx.throw(401)
  } catch (err) {
    return ctx.throw(401)
  }

  const record = {
    ultrasonic: Number(ctx.query.ultrasonic),
    waterlevel: Number(ctx.query.waterlevel),
    power: Number(ctx.query.power),
    recorded_at: new Date()
  }

  device = await ctx
    .db
    .collection('devices')
    .findOneAndUpdate({ _id: id }, { $set: { last_recorded: record } })

  await ctx
    .db
    .collection('records_origin')
    .insertOne({ device_id: id, ...record })

  if (isOK(ctx.query.notify)) {
    const notification = formatNotification({
      id,
      record,
      name: device.value.name
    })

    await ctx.fcm.send(notification)
  }

  ctx.body = 'OK'
  ctx.status = 200
}
