const Client = require('coinbase').Client;
const apiUrl = 'https://api.coinbase.com/v2/prices/spot?currency=USD'
const cdAPI = 'https://api.coindesk.com/v1/bpi/currentprice.json'
const secrets = require('./keys')
const cbKey = secrets.cbKey
const cbSecret = secrets.cbSecret

const cbVersion = '2017-08-23'
let buyMoney = true

let runStartPrice, lastPrice
let runActive = false
const desiredProfit = 30


let client = new Client({'apiKey': cbKey, 'apiSecret': cbSecret});

function checkForUpRun (currentPrice, proffLossPercent) {
  switch (true) {
    case (currentPrice === lastPrice):
      break
    case ((currentPrice > lastPrice) && !runActive):
      runStartPrice = currentPrice
      runActive = true
      break
    case (runActive && currentPrice > lastPrice):
      console.log('run going up')
      break
    case (runActive && (currentPrice < lastPrice)):
      console.log('run is ending, time to sell', runStartPrice, 'vs: ', currentPrice, 'diff', currentPrice - runStartPrice)
      runActive = false
      if (proffLossPercent > desiredProfit) {
        text.goText('sell bitcoin at ', currentPrice)
        doSell()
      }
      break
  }
  lastPrice = currentPrice
  return currentPrice
}

exports.getPrice =  ((req, response) => {
  client.getSpotPrice({'currencyPair': 'BTC-USD'}, function(err, obj) {
    console.log('total amount: ' + obj.data.amount)
    response.status(200).send(obj.data.amount)
  })
})

exports.getBCPrice = (() => {
  return new Promise((resolve, reject) => {
    client.getSpotPrice({'currencyPair': 'BTC-USD'}, function(err, obj) {
      if (err) reject(err)
      if (!err) resolve(obj.data.amount)
    })
  })
})
