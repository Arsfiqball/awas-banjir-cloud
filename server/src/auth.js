const jwt = require('jsonwebtoken')

const APP_SECRET = process.env.APP_SECRET || 'random123'

exports.bearer = async (ctx, next) => {
  if (ctx.request.headers.authorization) {
    const [scheme, token] = ctx.request.headers.authorization.split(' ')

    if (scheme === 'Bearer') {
      try {
        const decoded = jwt.verify(token, APP_SECRET, { algorithms: ['HS256'] })
        ctx.auth = decoded
      } catch (err) {
        return ctx.throw(401)
      }
    }
  }

  await next()
}

exports.createAdminToken = async function (secret) {
  const payload = {
    admin: 1,
    exp: Math.floor(Date.now() / 1000) + 3600
  }

  return jwt.sign(payload, secret || APP_SECRET, { algorithm: 'HS256' })
}
