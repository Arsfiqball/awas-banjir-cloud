const fetch = require('node-fetch')
const cron = require('node-cron')
const MongoClient = require('mongodb').MongoClient
const ObjectID = require('mongodb').ObjectID

const PORT = process.env.PORT || 8080
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017'
const MONGO_DB = process.env.MONGO_DB || 'awasbanjir'

function getRandomInt (min, max) {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min) + min)
}

function recordSensorLog (id, level, ultrasonic, power, notify) {
  const queries = [
    'ultrasonic=' + ultrasonic.toFixed(1),
    'waterlevel=' + level,
    'power=' + power.toFixed(5),
    notify ? 'notify=1' : null
  ]

  console.log(queries.filter(r => r).join('&'))

  return fetch(`http://localhost:${PORT}/device/${id}/write?${queries.filter(r => r).join('&')}`, { method: 'GET' })
}

const sensorIds = []

const sensors = {}

MongoClient
  .connect(MONGO_URL, { native_parser: true, useUnifiedTopology: true })
  .then(client => {
    const db = client.db(MONGO_DB)
    db.collection('devices').find().toArray().then(devices => {
      devices.map(r => {
        sensorIds.push(r._id)
      })
    })
  })
  .catch(console.error)

cron.schedule('*/15 * * * * *', async () => {
  sensorIds.map(id => {
    if (!sensors[id]) {
      sensors[id] = {}
    }

    sensors[id].ultrasonic = sensors[id].ultrasonic
      ? (sensors[id].ultrasonic + getRandomInt(sensors[id].ultrasonic > 50 ? -50 : 0 - sensors[id].ultrasonic, 50))
      : getRandomInt(0, 100)

    sensors[id].power = sensors[id].power
      ? (sensors[id].power + getRandomInt(sensors[id].power > .05 ? -5 : 0 - sensors[id].power / 0.01, 5) * 0.01)
      : getRandomInt(0, 100) * 0.01

    let newWaterLevel = sensors[id].ultrasonic >= 100 ? Math.floor((sensors[id].ultrasonic - 50) / 50) + 1 : 1

    if (newWaterLevel > 4) {
      newWaterLevel = 4
    } else if (newWaterLevel < 1) {
      newWaterLevel = 1
    }

    console.log(newWaterLevel === sensors[id].waterlevel)

    if (sensors[id].waterlevel && sensors[id].waterlevel !== newWaterLevel) {
      sensors[id].notify = true
    } else {
      sensors[id].notify = false
    }

    sensors[id].waterlevel = newWaterLevel
  })

  const res = await Promise.all(sensorIds.map(id => recordSensorLog(
    id,
    sensors[id].waterlevel,
    sensors[id].ultrasonic,
    sensors[id].power,
    sensors[id].notify
  )))
})
