const auth = require('./auth')

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin'

exports.login = async function (ctx) {
  const { username, password } = ctx.request.body

  if (!username || !password) {
    return ctx.throw(400)
  }

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return ctx.throw(401)
  }

  ctx.body = { token: await auth.createAdminToken(), success: true }
  ctx.status = 200
}

exports.revokeToken = async function (ctx) {
  if (!ctx.auth.admin) return ctx.throw(403)
  ctx.body = { token: await auth.createAdminToken(), success: true }
  ctx.status = 200
}
