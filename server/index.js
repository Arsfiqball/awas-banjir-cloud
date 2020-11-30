require('dotenv').config()

const path = require('path')
const Koa = require('koa')
const Router = require('@koa/router')
const bodyParser = require('koa-bodyparser')
const koaStatic = require('koa-static')

const firebase = require('./src/firebase')
const mongodb = require('./src/mongodb')
const device = require('./src/device-actions')
const admin = require('./src/admin-actions')
const auth = require('./src/auth')

const HOST = process.env.HOST || '0.0.0.0'
const PORT = process.env.PORT || 8080

const app = new Koa()
const router = new Router()

firebase.setup(app)
mongodb.setup(app)

router.post('/admin/login', admin.login)
router.get('/admin/revoke-token', admin.revokeToken)

router.post('/device/add', device.create)
router.put('/device/:id', device.update)
router.delete('/device/:id', device.remove)
router.get('/device/list', device.list)
router.get('/device/:id', device.read)
router.get('/device/:id/write', device.writeLog)

app.use(auth.bearer)
app.use(bodyParser())
app.use(router.routes())
app.use(router.allowedMethods())
app.use(koaStatic(path.resolve(__dirname, '../admin/dist')))

app.listen(PORT, HOST, () => {
  console.log(`Server listening at port ${HOST}:${PORT}`)
})
