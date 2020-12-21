const path = require('path')
const { program } = require('commander')
const packageJson = require('../package.json')
const jwt = require('jsonwebtoken')
const fs = require('fs')
const fetch = require('node-fetch')
const cron = require('node-cron')

require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
require('console-stamp')(console, 'HH:MM:ss.l')

const auth = require('../src/auth')

const devicePublicKey = fs.readFileSync(path.resolve(__dirname, 'public-key.pem'), 'utf8')
const devicePrivateKey = fs.readFileSync(path.resolve(__dirname, 'private-key.pem'), 'utf8')

program.version(packageJson.version)

program
  .command('create <count>')
  .option('-s, --server <hostname>', 'Server base or endpoint')
  .option('-k, --secret-key <string>', 'Admin token secret key')
  .description('Create bots, with key pairs: public-key.pem and private-key.pem')
  .action(async (count, opts) => {
    const token = await auth.createAdminToken(opts.secretKey || null)
    const bots = []

    for (let i = 0; i < count; i++) {
      bots.push('[BOT]: ' + Math.floor(Date.now() / 1000) + ' ' + (i + 1))
    }

    Promise
      .all(bots.map(r => fetch((opts.server || 'http://localhost:8080') + '/device/add', {
        method: 'POST',
        body: JSON.stringify({
          name: r,
          description: 'Just a random bot',
          secret_key: devicePublicKey
        }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token
        }
      })))
      .then((ress) => {
        console.log('Berhasil: ' + ress.map(r => r.status === 200).filter(r => r).length)
      })
      .catch(console.error)
  })

program
  .command('clear')
  .option('-s, --server <hostname>', 'Server base or endpoint')
  .option('-k, --secret-key <string>', 'Admin token secret key')
  .description('Clear all bots')
  .action(async (opts) => {
    const token = await auth.createAdminToken()

    fetch((opts.server || 'http://localhost:8080') + '/device/list', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token
      }
    })
      .then(res => res.json())
      .then(data => {
        const bots = data.filter(r => r.name.split(':')[0] === '[BOT]')

        Promise.all(bots.map(r => {
          return fetch((opts.server || 'http://localhost:8080') + '/device/' + r._id, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + token
            }
          })
        }))
          .then(() => console.log('done'))
          .catch(console.error)
      })
      .catch(err => console.log(err))
  })

program
  .command('cron-hit')
  .option('-s, --server <hostname>', 'Server base or endpoint')
  .option('-a, --all', 'Use all credentials, not just bots')
  .option('-k, --secret-key <string>', 'Admin token secret key')
  .description('Hit server with bots, with key pairs: public-key.pem and private-key.pem')
  .action(async (opts) => {
    const token = await auth.createAdminToken(opts.secretKey || null)

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
        notify ? 'notify=1' : null,
        '_token=' + jwt.sign({ aud: id }, devicePrivateKey, { algorithm: 'ES256' })
      ]

      return fetch(`${(opts.server || 'http://localhost:8080')}/device/${id}/write?${queries.filter(r => r).join('&')}`, { method: 'GET' })
    }

    fetch((opts.server || 'http://localhost:8080') + '/device/list', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token
      }
    })
      .then(res => res.json())
      .then(data => {
        const bots = opts.all ? data : data.filter(r => r.name.split(':')[0] === '[BOT]')
        const sensorIds = bots.map(r => r._id)
        const sensors = {}

        cron.schedule('*/15 * * * * *', async () => {
          sensorIds.forEach(id => {
            if (!sensors[id]) {
              sensors[id] = {}
            }

            sensors[id].ultrasonic = sensors[id].ultrasonic
              ? (sensors[id].ultrasonic + getRandomInt(sensors[id].ultrasonic > 5 ? -5 : 0 - sensors[id].ultrasonic, 5))
              : getRandomInt(0, 100)

            sensors[id].power = sensors[id].power
              ? (sensors[id].power + getRandomInt(sensors[id].power > 0.05 ? -5 : 0 - sensors[id].power / 0.01, 5) * 0.01)
              : getRandomInt(0, 100) * 0.01

            let newWaterLevel = sensors[id].ultrasonic >= 100 ? Math.floor((sensors[id].ultrasonic - 50) / 50) + 1 : 1

            if (newWaterLevel > 4) {
              newWaterLevel = 4
            } else if (newWaterLevel < 1) {
              newWaterLevel = 1
            }

            if (sensors[id].waterlevel && sensors[id].waterlevel !== newWaterLevel) {
              sensors[id].notify = true
            } else {
              sensors[id].notify = false
            }

            sensors[id].waterlevel = newWaterLevel
          })

          await Promise.all(sensorIds.map(id => recordSensorLog(
            id,
            sensors[id].waterlevel,
            sensors[id].ultrasonic,
            sensors[id].power,
            sensors[id].notify
          )))
        })
      })
      .catch(console.error)
  })

program
  .command('attack-hit <count>')
  .option('-s, --server <hostname>', 'Server base or endpoint')
  .option('-k, --secret-key <string>', 'Admin token secret key')
  .description('Hit server with bots (attack mode), with key pairs: public-key.pem and private-key.pem')
  .action(async (count, opts) => {
    const token = await auth.createAdminToken(opts.secretKey)

    async function recordSensorLog (id, n) {
      const queries = [
        'ultrasonic=100',
        'waterlevel=2',
        'power=0.55555',
        '_token=' + jwt.sign({ aud: id }, devicePrivateKey, { algorithm: 'ES256' })
      ]

      const ress = []

      for (let i = 0; i < n; i++) {
        ress[i] = await fetch(`${(opts.server || 'http://localhost:8080')}/device/${id}/write?${queries.filter(r => r).join('&')}`, { method: 'GET' })
      }

      return ress
    }

    console.log('Gather all bots...')

    fetch((opts.server || 'http://localhost:8080') + '/device/list', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token
      }
    })
      .then(res => res.json())
      .then(async (data) => {
        console.log('Bots gathered.')
        const bots = data.filter(r => r.name.split(':')[0] === '[BOT]')

        console.log('Start attacking...')
        console.time('attack')
        await Promise.all(bots.map(bot => recordSensorLog(bot.id, Number(count))))

        console.timeEnd('attack')
        console.log('Done.')
      })
      .catch(console.error)
  })

program
  .command('simulate-hit <id>')
  .option('-s, --server <hostname>', 'Server base or endpoint')
  .option('-k, --private-key <path>', 'Device private key')
  .option('-u, --ultrasonic <value>', 'Ultrasonic value')
  .option('-w, --waterlevel <value>', 'Waterlevel value')
  .option('-p, --power <value>', 'Power value')
  .option('-n, --notify', 'Send notification')
  .description('Simulate bot request to write log')
  .action(async (id, opts) => {
    const privateKey = opts.privateKey
      ? fs.readFileSync(path.resolve(process.cwd(), opts.privateKey), 'utf8')
      : devicePrivateKey

    const queries = [
      'ultrasonic=' + (opts.ultrasonic ? opts.ultrasonic : '100'),
      'waterlevel=' + (opts.waterlevel ? opts.waterlevel : '2'),
      'power=' + (opts.power ? opts.power : '0.55555'),
      opts.notify ? 'notify=1' : null,
      '_token=' + jwt.sign({ aud: id }, privateKey, { algorithm: 'ES256' })
    ]

    try {
      const res = await fetch(`${(opts.server || 'http://localhost:8080')}/device/${id}/write?${queries.filter(r => r).join('&')}`, { method: 'GET' })
      console.log('status: ' + res.status)
    } catch (err) {
      console.log(err)
    }
  })

program
  .command('mobile-homescreen-hit <users> <count>')
  .option('-s, --server <hostname>', 'Server base or endpoint')
  .description('Hit server with users from homescreen of mobile app (attack mode)')
  .action(async (users, count, opts) => {
    console.log('Start attacking...')
    console.time('attack')

    async function hit (n) {
      for (let i = 0; i < n; i++) {
        await fetch(`${(opts.server || 'http://localhost:8080')}/device/list`, { method: 'GET' })
      }
    }

    const instances = Array(Number(users)).fill(null)
    await Promise.all(instances.map(() => hit(Number(count))))

    console.timeEnd('attack')
    console.log('Done.')
  })

program
  .command('mobile-detail-hit <id> <users> <count>')
  .option('-s, --server <hostname>', 'Server base or endpoint')
  .description('Hit server with users from homescreen of mobile app (attack mode)')
  .action(async (id, users, count, opts) => {
    console.log('Start attacking...')
    console.time('attack')

    async function hit (n) {
      for (let i = 0; i < n; i++) {
        await fetch(`${(opts.server || 'http://localhost:8080')}/device/${id}?with_log=1`, { method: 'GET' })
      }
    }

    const instances = Array(Number(users)).fill(null)
    await Promise.all(instances.map(() => hit(Number(count))))

    console.timeEnd('attack')
    console.log('Done.')
  })

program.parse(process.argv)
