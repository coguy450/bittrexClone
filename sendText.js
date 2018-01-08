const Twilio = require('twilio')
const secrets = require('./keys')
const accountSid = secrets.accountSid
const authToken = secrets.authToken
const tClient = new Twilio(accountSid, authToken)

let doText = true

exports.goText = (msg, price) => {
  const currentTime = new Date().getHours()
  if (doText && currentTime < 23 && currentTime > 7) {
    tClient.messages.create({
      body: msg + price,
      to: '+13035892180',
      from: '+17206135946' // From a valid Twilio number
    }).then((message) => {
      console.log('text sent successfully', message.sid)
      doText = false
    })
  } else if (doText) {
    console.log('email here')
  }
}
