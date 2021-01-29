const util = require('util')
const exec = util.promisify(require('child_process').exec)

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

async function grepCPU () {
  const grep = "grep 'cpu ' /proc/stat | awk '{for (i=2; i<=NF; i++) total += $i} END {print total \",\" $5 }'"
  const stdout1 = (await exec(grep)).stdout
  const [total, idle] = stdout1.split(',').map(r => Number(r.trim()))
  return { total, idle }
}

function calculateCPU (prev, curr) {
  return (1 - (curr.idle - prev.idle) / (curr.total - prev.total)) * 100
}

module.exports = function (program) {
  program
    .command('measure-server-performance')
    .option('--plain-report', 'Report stats without property name and comma separated')
    .option('--interval', 'Interval')
    .description('Measuring server performance in several aspects')
    .action(async function (options) {
      const state = { cpu: await grepCPU() }

      setInterval(async () => {
        const cpu = await grepCPU()
        const percentCPU = calculateCPU(state.cpu, cpu)
        const totalKiloBytesMemory = await getTotalMemory()
        const activeKiloBytesMemory = await getActiveMemory()
        const percentMemory = activeKiloBytesMemory * 100 / totalKiloBytesMemory

        const dump = [
          `Time: ${(new Date()).toLocaleTimeString()}`,
          `PercentCPU: ${percentCPU.toFixed(3)}`,
          `PercentMemory: ${percentMemory.toFixed(3)}`,
          `KiloBytesMemory: ${activeKiloBytesMemory}`
        ]

        const plain = [
          (new Date()).toLocaleTimeString(),
          percentCPU.toFixed(3),
          percentMemory.toFixed(3),
          activeKiloBytesMemory
        ]

        console.log(options.plainReport ? plain.join(',') : dump.join(' '))
      }, options.interval || 1000)
    })
}
