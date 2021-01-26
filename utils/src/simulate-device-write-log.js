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
    .command('simulate-device-write-log-attack <id> <clones>')
    .option('--server <hostname>', 'Server base or endpoint')
    .option('--algorithm <alg>', 'Algorithm to sign device JWT RS256 or ES256 (default)')
    .option('--private-key <filepath>', 'Device private key file path')
    .option('--plain-report', 'Report stats without property name and comma separated')
    .description('Simulate bot request to write log')
    .action(async (id, clones, options) => {
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

      function botRequest (id) {
        return new Promise(function (resolve, reject) {
          const randomInt = max => Math.floor(Math.random() * Math.floor(max))

          const queries = [
            'ultrasonic=' + randomInt(200),
            'waterlevel=' + randomInt(3) + 1,
            'power=' + (randomInt(50000) / 10000).toFixed(4),
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

      async function botAttack (id, n) {
        let success = 0
        let bytesRead = 0
        let bytesWritten = 0

        const ress = []
        for (let i = 0; i < n; i++) {
          ress.push(botRequest(id))
        }

        await Promise.all(ress).then(responses => responses.forEach(res => {
          if (res.status === 200) success++
          bytesRead += res.bytesRead
          bytesWritten += res.bytesWritten
        }))

        return { success, bytesRead, bytesWritten }
      }

      const timeStart = (new Date()).toLocaleTimeString()
      const timeStartMS = Date.now()
      const results = await botAttack(id, clones)
      const timeEnd = (new Date()).toLocaleTimeString()
      const latency = Date.now() - timeStartMS

      const dump = [
        `TotalReqs: ${clones}`,
        `TimeStart: ${timeStart}`,
        `TimeEnd: ${timeEnd}`,
        `Latency: ${latency}`,
        `SuccessReqs: ${results.success}`,
        `BytesRead: ${results.bytesRead}`,
        `BytesWritten: ${results.bytesWritten}`
      ]

      const plain = [
        clones,
        timeStart,
        timeEnd,
        latency,
        results.success,
        results.bytesRead,
        results.bytesWritten
      ]

      console.log(options.plainReport ? plain.join(',') : dump.join(' '))
    })
}
