const http = require('http')
const https = require('https')
const fetch = require('node-fetch')

module.exports = function (program) {
  program
    .command('simulate-mobile-app-endpoint <target> <count>')
    .option('--id <uuid>', 'Pass ID parameters')
    .option('--server <hostname>', 'Server base or endpoint')
    .option('--rapid-trigger <hostname>', 'Rapid trigger host')
    .description('Simulate attacking endpoints for mobile app')
    .action(async (target, count, options) => {
      const server = options.server || 'http://localhost:8080'

      const targetable = {
        homescreen () {
          return new Promise(function (resolve, reject) {
            const uri = `${server}/device/list`
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

      async function rapidTrigger (label) {
        const startTime = Date.now()

        if (options.rapidTrigger) {
          await fetch(`${options.rapidTrigger}/start?label=${label}`, { method: 'GET' })
        }

        return {
          async done (results) {
            if (options.rapidTrigger) {
              await fetch(`${options.rapidTrigger}/stop`, { method: 'GET' })
            }

            return {
              time: Date.now() - startTime,
              successRate: count * 100 / results.success,
              bytesReadPerRequest: results.bytesRead / results.success,
              bytesWrittenPerRequest: results.bytesWritten / results.success,
              ...results
            }
          }
        }
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
      const rt = await rapidTrigger(count)
      const results = await multipleRequest(instances)
      const rtd = await rt.done(results)

      console.log()
      console.log('>> DATA:')
      console.log(Object.keys(rtd).join(';'))
      console.log(Object.values(rtd).join(';'))
      console.log()
      console.log(`Done making ${results.success} requests`)
    })
}
