const path = require('path')
const fs = require('fs')
const jwt = require('jsonwebtoken')

module.exports = function (program) {
  program
    .command('create-jwt-admin')
    .option('--admin-key <string>', 'Admin token secret key')
    .option('--expire <seconds>', 'Expires in seconds')
    .description('Create JWT for admin')
    .action(async function (options) {
      if (!options.adminKey) return console.error('Secret key is required!')

      const exp = Math.floor(Date.now() / 1000) + (options.expire || 3600)
      const payload = { admin: 1, exp }
      const jwtOpts = { algorithm: 'HS256' }
      const token = await jwt.sign(payload, options.adminKey, jwtOpts)

      console.log(token)
    })

  program
    .command('create-jwt-device <id>')
    .option('--private-key <filepath>', 'Device token private key path')
    .option('--algorithm <alg>', 'RS256 or ES256 (default)')
    .option('--expire <seconds>', 'Expires in seconds')
    .description('Create JWT for device')
    .action(async function (id, options) {
      if (!options.privateKey) return console.error('Private key is required!')

      if (options.algorithm) {
        if (!['ES256', 'RS256'].includes(options.algorithm)) {
          return console.error('Select available algorithm (RS256 or ES256)')
        }
      }

      const privateKeyPath = path.resolve(process.cwd(), options.privateKey)
      const privateKey = fs.readFileSync(privateKeyPath, 'utf8')

      const exp = Math.floor(Date.now() / 1000) + (options.expire || 3600)
      const payload = { aud: id, exp }
      const jwtOpts = { algorithm: options.algorithm || 'ES256' }
      const token = await jwt.sign(payload, privateKey, jwtOpts)

      console.log(token)
    })
}
