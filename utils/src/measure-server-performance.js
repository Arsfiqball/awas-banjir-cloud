const util = require('util')
const exec = util.promisify(require('child_process').exec)
const Koa = require('koa')
const Router = require('@koa/router')

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

async function getActiveMemory () {
  const grep = "grep \"Active:\" /proc/meminfo | awk '{ print $2 }'"
  const { stdout } = await exec(grep)
  return Number(stdout.trim())
}

async function getTotalMemory () {
  const grep = "grep \"MemTotal:\" /proc/meminfo | awk '{ print $2 }'"
  const { stdout } = await exec(grep)
  return Number(stdout.trim())
}

async function getTotalCPU () {
  const grep = "grep 'cpu ' /proc/stat | awk '{for (i=2; i<=NF; i++) total += $i} END {print total \",\" $5 }'"

  const stdout1 = (await exec(grep)).stdout
  const [prevTotal, prevIdle] = stdout1.split(',').map(r => Number(r.trim()))

  await delay(10)
  const stdout2 = (await exec(grep)).stdout
  const [total, idle] = stdout2.split(',').map(r => Number(r.trim()))

  return (1 - (idle - prevIdle) / (total - prevTotal)) * 100
}

async function getStats () {
  const [
    totalCPU,
    totalMemoryKiloBytes,
    totalActiveMemoryKiloBytes
  ] = await Promise.all([
    getTotalCPU(),
    getTotalMemory(),
    getActiveMemory()
  ])

  const totalMemory = totalActiveMemoryKiloBytes * 100 / totalMemoryKiloBytes

  return {
    totalCPU,
    totalMemory,
    totalActiveMemoryKiloBytes
  }
}

module.exports = function (program) {
  program
    .command('measure-server-status')
    .description('Measuring server performance in several aspects')
    .action(async function (options) {
      const stats = await getStats()
      console.log(stats)
    })

  program
    .command('measure-server-performance')
    .option('-p, --port <value>', 'Rapid trigger port')
    .option('-h, --host <value>', 'Rapid trigger host')
    .description('Measuring server performance in several aspects')
    .action(async function (options) {
      const app = new Koa()
      const router = new Router()
      const state = { label: null, intervalId: null, raw: [] }

      function accumulate () {
        const data = { label: state.label }

        for (let i = 0; i < state.raw.length; i++) {
          Object.keys(state.raw[i]).forEach(key => {
            if (!data[key]) data[key] = 0
            data[key] = Math.max(state.raw[i][key], data[key])
          })
        }

        return data
      }

      async function record () {
        const pss = await getStats()
        state.raw.push(pss)
      }

      router.get('/start', async function (ctx) {
        console.log('started', ctx.query.label)
        state.label = ctx.query.label
        state.raw = []
        await record()
        state.intervalId = setInterval(record, 50)
      })

      router.get('/stop', function (ctx) {
        clearInterval(state.intervalId)
        state.intervalId = null
        console.log(accumulate())
        console.log('stoped', state.label)
        state.label = null
      })

      app.use(router.routes())
      app.use(router.allowedMethods())

      const port = options.port || 9010
      const host = options.host || '127.0.0.1'

      app.listen(port, host, async () => {
        console.log(`Rapid trigger listening at ${host}:${port}`)
      })
    })
}
