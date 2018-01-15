'use strict'
const request = require('superagent')
const dbActions = require('./dbActions')
const coinbase = require('./coinbase')
const analyzers = require('./analyzers')
const CryptoJs = require('crypto-js')
const async = require('async')
const secrets = require('./keys')
const btKey = secrets.btKey
const btSecret = secrets.btSecret

const n = require('nonce')()
const btAPIBase = 'https://bittrex.com/api/v1.1/market/'
const btAcctBase = 'https://bittrex.com/api/v1.1/account/'

const bittrex = require('node-bittrex-api')
bittrex.options({
  'apikey' : btKey,
  'apisecret' : btSecret,
})

let marketData

dbActions.getMarkets((mongoMarks) => {
  marketData = mongoMarks
})

exports.getMarkets = getMarkets

function processResults (incomingResponse, response, markets) {
  let clonedResult = incomingResponse
  clonedResult.map((ac) => {
    const dayRng = (ac.High - ac.Low) / ac.Low * 100
    const sellPressure = (ac.OpenSellOrders / ac.Volume) * 100
    const buyPressure = (ac.OpenBuyOrders / ac.Volume) * 100
    ac.dayRng = dayRng.toFixed(2)
    Object.keys(ac).map((key) => {
      if (typeof ac[key] === 'number') {
        if (key === 'Volume') {
          ac[key] = ac[key].toFixed(0).replace(/\.?0+$/,'')
        } else {
          ac[key] = ac[key].toFixed(12).replace(/\.?0+$/,'')
        }
      }
    })

    if (Array.isArray(markets)) {
      markets.map((ma) => {
        if (ma.MarketName === ac.MarketName) {
          const down30 = ((ac.Last - ma.thirtyDayLow) / ma.thirtyDayLow) * 100
          const range30 = ((ma.thirtyDayHigh - ma.thirtyDayLow) / ma.thirtyDayLow) * 100
          ac.MarketCurrencyLong = ma.MarketCurrencyLong.slice(0,15)
          ac.goodToBuy = ma.goodToBuy
          ac.CMO = ma.CMO
          ac.DX = ma.DX
          ac.LastMinus5 = (ac.Last * 0.95).toFixed(12).replace(/\.?0+$/,'')
          ac.down30 = down30.toFixed(2)
          ac.range30 = range30.toFixed(2)
          ac.downDay = (((ac.Last - ac.Low)/ac.Low) * 100).toFixed(2)
        }
      })
    }
    delete ac.Created
    delete ac.TimeStamp
    delete ac.Bid
    delete ac.BaseVolume
    delete ac.OpenSellOrders
    delete ac.OpenBuyOrders
    delete ac.Ask
    delete ac.PrevDay
    delete ac.Volume
  })
  clonedResult = clonedResult.filter((obj) => (
    obj.downDay
    && obj.down30
 ))
  response.status(200).send(clonedResult)
}

exports.getMarketSummaries = (req, response) => {
  const btAPI = 'https://bittrex.com/api/v1.1/public/getmarketsummaries'
  request
   .get(btAPI)
   .end((err, res) => {
     if (err) console.error(err)
     dbActions.getMarkets((mongoMarks) => {
       processResults(res.body.result, response, mongoMarks)
     })
   })
}

function getMarkets (callback) {
  const btAPI = 'https://bittrex.com/api/v1.1/public/getmarkets'
  request.get(btAPI).end((err, res) => {
    if (err) console.error(err)
    callback(res.body.result)
  })
}

exports.getCurrencies = (req, response) => {
  const btAPI = 'https://bittrex.com/api/v1.1/public/getCurrencies'
  request.get(btAPI).end((err, res) => {
    if (err) console.error(err)
    response.status(200).send(res.body.result)
  })
}

exports.getBalances = (req, res) => {
  console.time('bals')
  bittrex.getbalances(function(data, err) {
    coinbase.getBCPrice().then(function(bcAmt) {
      async.eachLimit(data.result, 15, (item, done) => {
        let marketName
        if (item.Currency === 'BTC') {
          marketName = 'USDT-BTC'
          item.Last = bcAmt
          item.dollarAmt = (item.Balance * bcAmt).toFixed(2)
          done()
        } else if (item.Currency === 'USDT') {
          marketName = null
          item.dollarAmt = item.Balance.toFixed(2)
          done()
        } else {
          marketName = 'BTC-' + item.Currency
          if (item.Balance > 0) {
            exports.getTicks(marketName, function(tick) {
              item.Last = tick ? tick.result.Last : null
              item.bcAmount = item.Last * item.Balance
              item.dollarAmt = (item.bcAmount * bcAmt).toFixed(2)
              done()
            })
          } else {
            item.dollarAmt = 0
            done()
          }

        }
      }, function () {
        console.timeEnd('bals')
        res.status(200).send(data)
      })
    })
  })
}

exports.getFifty = (req, res) => {
  const purchasePrice = req.query.newAmt
  coinbase.getBCPrice().then(function(bcAmt) {
    const bitCoin50 = (70 / bcAmt).toFixed(8).replace(/\.?0+$/,'')
    res.status(200).send(bitCoin50)
  })
}

function processFilteredDates (filteredDate) {
  if (filteredDate.length > 0) {
    let thirtyDayLow = filteredDate[0].L || null
    let thirtyDayHigh = filteredDate[0].H || null
    filteredDate.map((obj) => {
      if (obj && obj.L && obj.L < thirtyDayLow) thirtyDayLow = obj.L || null
      if (obj && obj.H && obj.H > thirtyDayHigh) thirtyDayHigh = obj.H || null
      Object.keys(obj).map((key) => {
        if (typeof obj[key] === 'number') {
          obj[key] = obj[key].toFixed(12).replace(/\.?0+$/,'')
        }
      })
    })
    return [thirtyDayLow, thirtyDayHigh]
  } else {
    return [null, null]
  }
}

function processThirty (input) {
  return new Promise((resolve, reject) => {
    const clonedInput = input
    var d = new Date()
    d.setDate(d.getDate() - 30)
    const filteredDate = input.filteredDates.filter((obj) => new Date(obj.T) > d)
    const procResult = processFilteredDates(filteredDate)
    clonedInput.thirtyDayLow = procResult[0]
    clonedInput.thirtyDayHigh = procResult[1]
    resolve(clonedInput)
  })
}

function processSixty (input) {
  return new Promise((resolve, reject) => {
    const clonedInput = input
    var d = new Date()
    d.setDate(d.getDate() - 60)
    const filteredDate = input.filteredDates.filter((obj) => new Date(obj.T) > d)
    const procResult = processFilteredDates(filteredDate)
    clonedInput.sixtyDayLow = procResult[0]
    clonedInput.sixtyDayHigh = procResult[1]
    resolve(clonedInput)
  })
}

function processNinety (input) {
 return new Promise((resolve, reject) => {
   const clonedInput = input
   var d = new Date()
   d.setDate(d.getDate() - 90)
   const filteredDate = input.filter((obj) => new Date(obj.T) > d)
   const procResult = processFilteredDates(filteredDate)
   clonedInput.ninetyDayLow = procResult[0]
   clonedInput.ninetyDayHigh = procResult[1]
   resolve({
     ninetyDayLow: procResult[0],
     ninetyDayHigh: procResult[1],
     filteredDates: filteredDate
   })
 })
}

exports.getAllHistory = (marketName, callback) => {
  bittrex.getcandles({
  marketName: marketName,
  //  startTime: 1503680400,
  tickInterval: 'day' //intervals are keywords
  }, function( data, err ) {
      if (data) {
        processNinety(data.result).then(processSixty).then(processThirty).then((result) => {
          analyzers.transformData(data.result).then((analysis) => {
              console.log('analysis', analysis)
              result.CMO = analysis.CMO
              result.DX = analysis.DX
              callback(result)
          })
        })
      } else {
        callback()
      }
  })
}

exports.getHistory = (req, res) => {
    const interval = req.query.timePeriod || 'day'
    bittrex.getcandles({
    marketName: req.query.market,
    _: 1503680400,
    tickInterval: interval, //  'oneMin', 'fiveMin', 'thirtyMin, 'hour', 'day'.
  }, function( data, err ) {
      analyzers.transformData(data.result).then(analysis => {
        const payload = {graph: data.result, analysis: analysis}
        res.status(200).send(payload)
      })

  })
}

exports.getTicks = (market, callback) => {
  bittrex.getticker( { market : market }, function( ticker ) {
   callback(ticker)
  })
}

exports.refreshPrice = (req, res) => {
  const market = req.body.market
  exports.getTicks(market, (result) => {
    res.status(200).send(result)
  })
}

exports.getOrders = (req, res) => {
  const btAPI = req.query.historic === 'true' ? `${btAcctBase}getorderhistory?APIKEY=${btKey}&nonce=${n()}` :
   `https://bittrex.com/api/v1.1/market/getopenorders?APIKEY=${btKey}&nonce=${n()}`
  const ciphertext = CryptoJs.HmacSHA512(btAPI, btSecret).toString()
  request
   .get(btAPI)
   .set('apisign', ciphertext)
   .end((err, data) => {
     if (req.query.historic === 'true') {
       data.body.result.map((obj) => {
         if (obj && obj.Limit) {
           try {
             obj.Limit = obj.Limit.toFixed(12).replace(/\.?0+$/,'')
             obj.PricePerUnit = obj.PricePerUnit.toFixed(12).replace(/\.?0+$/,'')
           } catch (e) {
             console.log(e)
           }
         }
       })
       dbActions.autoAddHolding(data.body.result)
       dbActions.autoSellHolding(data.body.result)
       dbActions.autoAddOrders(data.body.result)
     }
     if (err) console.error(err)
     res.status(200).send(data.body)
   })
}

exports.makeOrder = (req, res) => {
  const marketName = req.query.market
  const quantity = req.query.quantity
  const buyPrice = req.query.price
  const btAPI = `${btAPIBase}buylimit?APIKEY=${btKey}&nonce=${n()}&market=${marketName}&quantity=${quantity}&rate=${buyPrice}`
  const ciphertext = CryptoJs.HmacSHA512(btAPI, btSecret).toString()
  console.log('buying something', marketName, quantity, buyPrice)
  if (marketName && quantity && buyPrice) {
    request
     .get(btAPI)
     .set('apisign', ciphertext)
     .end((err, data) => {
       // {"success":true,"message":"","result":{"uuid":"a29a98c1-20d3-42e3-aa38-74c11d3fafd3"}}
       if (err) console.error(err)
       res.status(200).send(data.body)
     })
  }
}

exports.sellOrder = (req, res) => {
  const market = req.body.market
  const quantity = req.body.quantity
  const sellPrice = req.body.sellPrice ? '&rate=' + req.body.sellPrice : null
  console.log(sellPrice)
  const btAPI = `${btAPIBase}selllimit?APIKEY=${btKey}&nonce=${n()}&market=${market}&quantity=${quantity}${sellPrice}`
  const ciphertext = CryptoJs.HmacSHA512(btAPI, btSecret).toString()
  request
   .get(btAPI)
   .set('apisign', ciphertext)
   .end((err, data) => {
     // {"success":true,"message":"","result":{"uuid":"cd340c59-e0f5-4839-8e29-b26d82e844f1"}}
     if (err) console.error(err)
     console.log(data.body)
     res.status(200).send(data.body)
   })
}

exports.cancelOrder = (req, res) => {
  const orderUid = req.query.cancelId
  console.log('order id', orderUid)
  const btAPI = `${btAPIBase}cancel?apikey=${btKey}&uuid=${orderUid}&nonce=${n()}`
  const ciphertext = CryptoJs.HmacSHA512(btAPI, btSecret).toString()
  request
   .get(btAPI)
   .set('apisign', ciphertext)
   .end((err, data) => {
    // console.log(err, data)
     if (err) console.log(err)
     exports.getOrders(req, res)
   })
}
