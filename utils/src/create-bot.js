const path = require('path')
const fs = require('fs')
const jwt = require('jsonwebtoken')
const fetch = require('node-fetch')

module.exports = function (program) {
  program
    .command('create-bot')
    .option('--server <hostname>', 'Server API base')
    .option('--multiply <value>', 'Create multiple bots')
    .option('--admin-key <string>', 'Admin token secret key')
    .option('--public-key <string>', 'Device public key file path')
    .description('Create device bots credentials')
    .action(async function (options) {
      if (!options.adminKey) return console.error('Secret key is required!')
      if (!options.publicKey) return console.error('Device public key is required!')

      const server = options.server || 'https://localhost:8080'
      const multiply = options.multiply || 1
      const adminKey = options.adminKey
      const publicKeyPath = path.resolve(process.cwd(), options.publicKey)
      const publicKey = fs.readFileSync(publicKeyPath, 'utf8')

      const exp = Math.floor(Date.now() / 1000) + 3600
      const payload = { admin: 1, exp }
      const jwtOpts = { algorithm: 'HS256' }
      const token = await jwt.sign(payload, adminKey, jwtOpts)

      const bots = []
      const createdAt = Math.floor(Date.now() / 1000)
      for (let i = 1; i <= multiply; i++) bots.push(`[BOT]: ${createdAt} ${i}`)

      async function requestCreateBot (name) {
        return fetch(`${server}/device/add`, {
          method: 'POST',
          body: JSON.stringify({
            name,
            description: 'Just a random bot',
            secret_key: publicKey
          }),
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        })
      }

      const ress = await Promise.all(bots.map(r => requestCreateBot(r)))
      const success = ress.map(r => r.status === 200).filter(r => r).length

      console.log(`Success: ${success} bots`)
    })

  program
    .command('clear-bot')
    .option('--server <hostname>', 'Server API base')
    .option('--admin-key <string>', 'Admin token secret key')
    .description('Clear all bots')
    .action(async function (options) {
      if (!options.adminKey) return console.error('Secret key is required!')

      const server = options.server || 'https://localhost:8080'
      const adminKey = options.adminKey

      const exp = Math.floor(Date.now() / 1000) + 3600
      const payload = { admin: 1, exp }
      const jwtOpts = { algorithm: 'HS256' }
      const token = await jwt.sign(payload, adminKey, jwtOpts)

      const res = await fetch(`${server}/device/list`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token
        }
      })

      const data = await res.json()
      const bots = data.filter(r => r.name.split(':')[0] === '[BOT]')

      function requestDeleteBot (device) {
        return fetch(`${server}/device/${device._id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token
          }
        })
      }

      const ress = await Promise.all(bots.map(r => requestDeleteBot(r)))
      const success = ress.map(r => r.status === 200).filter(r => r).length

      console.log(`Success: ${success} bots`)
    })
}
