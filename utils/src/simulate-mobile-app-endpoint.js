const http = require('http')
const https = require('https')

module.exports = function (program) {
  program
    .command('simulate-mobile-app-endpoint <target> <count>')
    .option('--id <uuid>', 'Pass ID parameters')
    .option('--server <hostname>', 'Server base or endpoint')
    .option('--plain-report', 'Report stats without property name and comma separated')
    .description('Simulate attacking endpoints for mobile app')
    .action(async (target, count, options) => {
      const server = options.server || 'http://localhost:8080'

      const targetable = {
        homescreen () {
          return new Promise(function (resolve, reject) {
            const path = '/device/list?limit=10'
            const parsedURI = new URL(server)

            const options = {
              hostname: parsedURI.hostname,
              port: parsedURI.port,
              path: path,
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
        },

        detail () {
          return new Promise(function (resolve, reject) {
            if (!options.id) return reject(new Error('ID Required!'))

            const uri = `${server}/device/${options.id}`
            const parsedURI = new URL(uri)

            const reqOpts = {
              hostname: parsedURI.hostname,
              port: parsedURI.port,
              path: parsedURI.path,
              method: 'GET'
            }

            const protocol = parsedURI.protocol === 'https' ? https : http
            const req = protocol.request(reqOpts)

            req.once('response', res => resolve({
              status: res.statusCode,
              bytesRead: req.socket.bytesRead,
              bytesWritten: req.socket.bytesWritten
            }))

            req.on('error', reject)
            req.end()
          })
        }
      }

      if (!targetable[target]) {
        return console.error('No target available')
      }

      async function multipleRequest (instances) {
        const results = await Promise.all(instances.map(() => targetable[target]()))

        return {
          success: results.map(r => r.status === 200).reduce((a, c) => a + c),
          bytesRead: results.map(r => r.bytesRead).reduce((a, c) => a + c),
          bytesWritten: results.map(r => r.bytesWritten).reduce((a, c) => a + c)
        }
      }

      const instances = Array(Number(count)).fill(null)
      const timeStart = (new Date()).toLocaleTimeString()
      const timeStartMS = Date.now()
      const results = await multipleRequest(instances)
      const timeEnd = (new Date()).toLocaleTimeString()
      const latency = Date.now() - timeStartMS

      const dump = [
        `TimeStart: ${timeStart}`,
        `TimeEnd: ${timeEnd}`,
        `Latency: ${latency}`,
        `SuccessReqs: ${results.success}`,
        `BytesRead: ${results.bytesRead}`,
        `BytesWritten: ${results.bytesWritten}`
      ]

      const plain = [
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
