const admin = require('firebase-admin')
const serviceAccount = require('../fcm-key.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://arsfiqball-awas-banjir.firebaseio.com'
})

exports.setup = (app) => {
  app.context.fcm = admin.messaging()
}
