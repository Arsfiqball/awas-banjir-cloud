const psList = require('ps-list')
const Koa = require('koa')
const Router = require('@koa/router')

async function getStats (pid) {
  const pss = await psList()

  const totalCPU = pss.map(r => r.cpu).reduce((a, b) => a + b)
  const totalMemory = pss.map(r => r.memory).reduce((a, b) => a + b)

  const api = pss.filter(r => r.pid.toString() === pid.toString())
  const apiCPU = api.map(r => r.cpu).reduce((a, b) => a + b)
  const apiMemory = api.map(r => r.memory).reduce((a, b) => a + b)

  const mongod = pss.filter(r => r.name === 'mongod')
  const mongodCPU = mongod.map(r => r.cpu).reduce((a, b) => a + b)
  const mongodMemory = mongod.map(r => r.memory).reduce((a, b) => a + b)

  return {
    totalCPU,
    totalMemory,
    apiCPU,
    apiMemory,
    mongodCPU,
    mongodMemory
  }
}

module.exports = function (program) {
  program
    .command('measure-server-performance <pid>')
    .option('-p, --port <value>', 'Rapid trigger port')
    .option('-h, --host <value>', 'Rapid trigger host')
    .description('Measuring server performance in several aspects')
    .action(async function (pid, options) {
      const app = new Koa()
      const router = new Router()
      const state = { active: false, label: 0, raw: [], max: [] }

      function accumulate () {
        const data = { label: state.label }

        for (let i = 0; i < state.raw.length; i++) {
          Object.keys(state.raw[i]).forEach(key => {
            if (!data[key]) data[key] = 0
            data[key] += state.raw[i][key]
          })
        }

        console.log(data)

        state.max.push(data) // todo
        state.raw = []
      }

      router.get('/start', function (ctx) {
        if (state.raw.length) accumulate()
        state.label = ctx.query.label
        state.active = true
      })

      router.get('/stop', function (ctx) {
        if (state.raw.length) accumulate()
        state.active = false
      })

      setInterval(async () => {
        if (state.active) {
          state.raw.push(await getStats(pid))
        }
      }, 1000)

      app.use(router.routes())
      app.use(router.allowedMethods())

      const port = options.port || 9010
      const host = options.host || '127.0.0.1'

      app.listen(port, host, async () => {
        console.log(`Rapid trigger listening at ${host}:${port}`)
      })
    })
}
