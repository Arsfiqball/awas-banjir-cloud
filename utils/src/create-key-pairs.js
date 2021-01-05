const util = require('util')
const exec = util.promisify(require('child_process').exec)

module.exports = function (program) {
  program
    .command('create-key-pairs')
    .option('-k, --private-output <filename>', 'Private key file to output')
    .option('-p, --public-output <filename>', 'Public key file to output')
    .description('Create ECDSA using P-256 and SHA-256 key pairs')
    .action(async function (options) {
      async function createPrivate (privateOutput) {
        const cmd = `openssl ecparam -name prime256v1 -genkey -noout -out ${privateOutput}`
        const { stdout, stderr } = await exec(cmd, { cwd: process.cwd() })
        if (stdout) console.error(stderr)
        if (stderr) console.error(stderr)
      }

      async function createPublic (privateOutput, publicOutput) {
        const cmd = `openssl ec -in ${privateOutput} -pubout -out ${publicOutput}`
        const { stdout, stderr } = await exec(cmd, { cwd: process.cwd() })
        if (stdout) console.error(stderr)
        if (stderr) console.error(stderr)
      }

      if (!options.privateOutput) return console.error('Private output is required!')
      if (!options.publicOutput) return console.error('Public output is required!')

      await createPrivate(options.privateOutput)
      await createPublic(options.privateOutput, options.publicOutput)
    })
}
