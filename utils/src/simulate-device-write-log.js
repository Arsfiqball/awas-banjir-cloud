const path = require('path')
const fs = require('fs')
const http = require('http')
const https = require('https')
const jwt = require('jsonwebtoken')
const fetch = require('node-fetch')

module.exports = function (program) {
  program
    .command('simulate-device-write-log <id>')
    .option('-a, --algorithm <name>', 'Algorithm to sign JWT (ES256 or RS256)')
    .option('-s, --server <hostname>', 'Server base or endpoint')
    .option('-k, --private-key <filepath>', 'Device private key')
    .option('-u, --ultrasonic <value>', 'Ultrasonic value')
    .option('-w, --waterlevel <value>', 'Waterlevel value')
    .option('-p, --power <value>', 'Power value')
    .option('-n, --notify', 'Send notification')
    .description('Simulate bot request to write log')
    .action(async (id, options) => {
      if (!options.privateKey) return console.log('Private key required!')

      if (options.algorithm) {
        if (!['ES256', 'RS256'].includes(options.algorithm)) {
          return console.error('Select available algorithm (RS256 or ES256)')
        }
      }

      const server = options.server || 'http://localhost:8080'
      const privateKeyPath = path.resolve(process.cwd(), options.privateKey)
      const privateKey = fs.readFileSync(privateKeyPath, 'utf8')
      const jwtOpts = { algorithm: options.algorithm || 'ES256' }

      const queries = [
        options.ultrasonic ? 'ultrasonic=' + options.ultrasonic : null,
        options.waterlevel ? 'waterlevel=' + options.waterlevel : null,
        options.power ? 'power=' + options.power : null,
        options.notify ? 'notify=1' : null,
        '_token=' + jwt.sign({ aud: id }, privateKey, jwtOpts)
      ]

      const queryString = queries.filter(r => r).join('&')
      const uri = `${server}/device/${id}/write?${queryString}`
      const res = await fetch(uri, { method: 'GET' })
      console.log('Status: ' + res.status)
    })

  program
    .command('simulate-device-write-log-attack <clones>')
    .option('--multiply <request>', 'How many request each clones have to do')
    .option('--server <hostname>', 'Server base or endpoint')
    .option('--admin-key <string>', 'Admin token secret key')
    .option('--algorithm <alg>', 'Algorithm to sign device JWT RS256 or ES256 (default)')
    .option('--public-key <filepath>', 'Device public key file path')
    .option('--private-key <filepath>', 'Device private key file path')
    .option('--plain-report', 'Report stats without property name and comma separated')
    .description('Simulate bot request to write log')
    .action(async (clones, options) => {
      if (!options.adminKey) return console.error('Admin secret key is required!')
      if (!options.publicKey) return console.error('Device public key is required!')
      if (!options.privateKey) return console.log('Private key required!')

      if (options.algorithm) {
        if (!['ES256', 'RS256'].includes(options.algorithm)) {
          return console.error('Select available algorithm (RS256 or ES256)')
        }
      }

      const server = options.server || 'http://localhost:8080'
      const adminKey = options.adminKey
      const privateKeyPath = path.resolve(process.cwd(), options.privateKey)
      const privateKey = fs.readFileSync(privateKeyPath, 'utf8')
      const publicKeyPath = path.resolve(process.cwd(), options.publicKey)
      const publicKey = fs.readFileSync(publicKeyPath, 'utf8')
      const jwtOpts = { algorithm: options.algorithm || 'ES256' }

      const exp = Math.floor(Date.now() / 1000) + 3600
      const payload = { admin: 1, exp }
      const token = await jwt.sign(payload, adminKey, { algorithm: 'HS256' })

      async function requestCreateBot (name) {
        return fetch(`${server}/device/add`, {
          method: 'POST',
          body: JSON.stringify({
            name,
            description: 'Just a random bot',
            coordinate: '1,1',
            secret_key: publicKey
          }),
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        })
      }

      async function generateBots () {
        const bots = []
        const createdAt = Math.floor(Date.now() / 1000)
        for (let i = 1; i <= clones; i++) bots.push(`[BOT]: ${createdAt} ${i}`)
        const ress = await Promise.all(bots.map(r => requestCreateBot(r)))
        return Promise.all(ress.filter(r => r.status === 200).map(r => r.json()))
      }

      function botRequest (id) {
        return new Promise(function (resolve, reject) {
          const queries = [
            'ultrasonic=100',
            'waterlevel=2',
            'power=0.55555',
            '_token=' + jwt.sign({ aud: id }, privateKey, jwtOpts)
          ]

          const queryString = queries.filter(r => r).join('&')
          const uri = `${server}/device/${id}/write?${queryString}`
          const parsedURI = new URL(uri)

          const options = {
            hostname: parsedURI.hostname,
            port: parsedURI.port,
            path: parsedURI.path,
            method: 'GET'
          }

          const protocol = parsedURI.protocol === 'https' ? https : http
          const req = protocol.request(options)

          req.once('response', res => resolve({
            status: res.statusCode,
            bytesRead: req.socket.bytesRead,
            bytesWritten: req.socket.bytesWritten
          }))

          req.on('error', reject)
          req.end()
        })
      }

      async function singleBotAttack (bot, n) {
        let success = 0
        let bytesRead = 0
        let bytesWritten = 0

        for (let i = 0; i < n; i++) {
          const res = await botRequest(bot._id)
          if (res.status === 200) success++
          bytesRead += res.bytesRead
          bytesWritten += res.bytesWritten
        }

        return { success, bytesRead, bytesWritten }
      }

      async function multipleBotAttack (bots) {
        const n = options.multiply || 1
        const results = await Promise.all(bots.map(r => singleBotAttack(r, n)))

        return {
          success: results.map(r => r.success).reduce((a, c) => a + c),
          bytesRead: results.map(r => r.bytesRead).reduce((a, c) => a + c),
          bytesWritten: results.map(r => r.bytesWritten).reduce((a, c) => a + c)
        }
      }

      async function requestDeleteBot (device) {
        return fetch(`${server}/device/${device._id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token
          }
        })
      }

      async function clearBots (bots) {
        const ress = await Promise.all(bots.map(r => requestDeleteBot(r)))
        return ress.filter(r => r.status === 200).length
      }

      const bots = await generateBots()
      const timeStart = (new Date()).toLocaleTimeString()
      const timeStartMS = Date.now()
      const results = await multipleBotAttack(bots)
      const timeEnd = (new Date()).toLocaleTimeString()
      const removed = await clearBots(bots)
      const latency = Date.now() - timeStartMS

      const dump = [
        `TimeStart: ${timeStart}`,
        `TimeEnd: ${timeEnd}`,
        `Created: ${bots.length}`,
        `Latency: ${latency}`,
        `SuccessReqs: ${results.success}`,
        `BytesRead: ${results.bytesRead}`,
        `BytesWritten: ${results.bytesWritten}`,
        `Removed: ${removed}`
      ]

      const plain = [
        timeStart,
        timeEnd,
        bots.length,
        latency,
        results.success,
        results.bytesRead,
        results.bytesWritten,
        removed
      ]

      console.log(options.plainReport ? plain.join(',') : dump.join(' '))
    })
}
