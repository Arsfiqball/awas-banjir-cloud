require('dotenv').config()

const admin = require('firebase-admin')
const serviceAccount = require('../fcm-key.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://arsfiqball-awas-banjir.firebaseio.com'
})

function send (title, body) {
  const message = {
    topic: 'all_sensors',
    notification: {
      body,
      title
    },
    android: {
      notification: {
        click_action: 'FLUTTER_NOTIFICATION_CLICK'
      }
    },
    data: {
      name: 'haha',
      status: 'hihi'
    }
  }

  return admin.messaging().send(message)
}

send('Hello', 'There').then(console.log).catch(console.error)
