const util = require('util')
const exec = util.promisify(require('child_process').exec)

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

  await delay(500)
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
    .command('measure-server-performance')
    .option('--plain-report', 'Report stats without property name and comma separated')
    .description('Measuring server performance in several aspects')
    .action(async function (options) {
      const stats = await getStats()

      const dump = [
        `Time: ${(new Date()).toLocaleTimeString()}`,
        `TotalCPU: ${stats.totalCPU.toFixed(3)}`,
        `TotalMemory: ${stats.totalCPU.toFixed(3)}`,
        `TotalActiveMemory: ${stats.totalActiveMemoryKiloBytes}`
      ]

      const plain = [
        (new Date()).toLocaleTimeString(),
        stats.totalCPU.toFixed(3),
        stats.totalMemory.toFixed(3),
        stats.totalActiveMemoryKiloBytes
      ]

      console.log(options.plainReport ? plain.join(',') : dump.join(' '))
    })
}
