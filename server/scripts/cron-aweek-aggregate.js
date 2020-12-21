const cron = require('node-cron')
const mongodb = require('../src/mongodb')

mongodb
  .createConnection()
  .then(db => {
    // cron.schedule('1 * * * *', async () => {
    //   db
    //     .collection('records_origin')
    //     .aggregate([{
    //       $group: {
    //         _id: 1,
    //         ultrasonic: { $avg: '$ultrasonic' },
    //         waterlevel: { $avg: '$waterlevel' },
    //         power: { $avg: '$power' }
    //       }
    //     }])
    //     .toArray()
    // })
    db
      .collection('records_origin')
      .aggregate([{
        $group: {
          _id: '$device_id',
          ultrasonic: { $avg: '$ultrasonic' },
          waterlevel: { $avg: '$waterlevel' },
          power: { $avg: '$power' },
          recorded_at: { $max: '$recorded_at' }
        }
      }])
      .toArray()
      .then(values => {
        values = values.map(r => ({
          device_id: r._id,
          ultrasonic: Number(r.ultrasonic.toFixed(2)),
          waterlevel: Number(r.waterlevel.toFixed(0)),
          power: Number(r.power.toFixed(5)),
          recorded_at: r.recorded_at
        }))

        db
          .collection('records_perhour')
          .insertMany(values)
          .then(console.log)
      })
  })
  .catch(console.error)
