'use strict'
const MongoClient = require('mongodb').MongoClient
const request = require('superagent')
const actions = require('./actions')
const async = require('async')
const text = require('./sendText')
const secrets = require('./keys')
// const connectionString = process.env.PROD_MONGODB ? process.env.PROD_MONGODB : 'mongodb://localhost/bitcoin'
const connectionString = secrets.connectionString

let thisDB
// const bcPurchaseAmt = 0.012 // about $100 when btc is at 8300

const conMongo = ((callback) => {
  if (!thisDB) {
    MongoClient.connect(connectionString, (err, db) => {
      if (err) {
        console.log('error, trying to reconnect', err, thisDB);
        setTimeout(conMongo(callback), 2000)
      } else {
        thisDB = db;
        callback(thisDB);
      }
    })
  } else {
    callback(thisDB);
  }
})

exports.getMarkets = (callback) => {
  conMongo((db) => {
    const col = db.collection('markets')
    const whichFields = {_id: 0, BaseCurrencyLong: 0, BaseCurrency: 0, BaseMarket: 0, MinTradeSize: 0, Created:0, Notice: 0, isSponsored: 0}
    col.find({$or: [{goodToBuy: 'true'}, {goodToBuy: {$exists: false}}]}, whichFields).toArray((err, results) => {
      callback(results)
    })
  })
}

exports.getOneMarket = ((req, res) => {
  const market = req.query.market
  conMongo((db) => {
    const col = db.collection('markets')
    col.find({MarketName: market}).toArray((err, result) => {
      res.status(200).send(result)
    })
  })
})

exports.saveMarkets = ((req, res) => {
  conMongo((db) => {
   const col = db.collection('markets');
    actions.getMarkets((marks) => {
      marks.map((m) => {
        col.find({MarketName: m.MarketName}).toArray((err, mark) => {
          if (mark.length === 0) {
            col.update({MarketName: m.MarketName}, m, {upsert: true}, (err, result) => {
              if (err) console.error(err)
            })
          }
        })
      })
      res.status(200).send('markets seeded correctly')
    })
  })
})

exports.getHighsLows = ((req, res) => {
  conMongo((db) => {
    const col = db.collection('markets')
    col.find().toArray((err, results) => {
      if (err) console.error(err)
      async.eachLimit(results, 8, (item, done) => {
        console.log(item.MarketName)
        setTimeout(() => {
          actions.getAllHistory(item.MarketName, (history) => {
            if (history && history.thirtyDayHigh) {
              col.update({MarketName: item.MarketName}, {$set: {
                thirtyDayHigh: history.thirtyDayHigh,
                thirtyDayLow: history.thirtyDayLow,
                sixtyDayLow: history.sixtyDayLow,
                sixtyDayHigh: history.sixtyDayHigh,
                ninetyDayLow: history.ninetyDayLow,
                ninetyDayHigh: history.ninetyDayHigh,
                CMO: history.CMO,
                DX: history.DX
              }}, (uErr, updated) => {
                if (uErr) console.log(uErr)
                done()
              })
            } else {
              done()
            }
          })
        }, 10)
      }, (err) => {
        if (err) console.log(err)
        res.status(200).send('done getting highs and lows')
      })
    })
  })
})

// exports.doFakeBuy = ((req, res) => {
//   conMongo((db) => {
//     const col = db.collection('holdings')
//     const obj = {
//       Exchange: req.query.market,
//       quantity: bcPurchaseAmt,
//       timePurchased: new Date(),
//       PricePerUnit: req.query.price,
//       bcValue: req.query.bcValue,
//       shares: bcPurchaseAmt / req.query.price
//     }
//     col.insert(obj, (err, result) => {
//       res.status(200).send(result)
//     })
//   })
// })

exports.getHoldings = ((req, res) => {
  MongoClient.connect(connectionString, (err, db) => {
    let resultsWithTicks
    const col = db.collection('holdings')
    const markets = db.collection('markets')
    const excludeFields = {ConditionTarget: 0, Condition: 0, ImmediateOrCancel: 0, IsConditional: 0, QuantityRemaining: 0}
    col.find({sold:{$exists: false}}, excludeFields).toArray((fErr, results) => {
      if (fErr) console.log(fErr)
      if (results.length === 0) {
        console.log('why no holdings?')
      }
        async.eachLimit(results, 10, (item, done) => {
    //      actions.getTicks(item.Exchange, function(tick) {
            markets.find({MarketName: item.Exchange}).toArray((fErr, foundMarket) => {
              item.name = foundMarket[0].MarketCurrencyLong || null
              item.logo = foundMarket[0].LogoUrl
        //      item.tick = tick && tick.result.Last ? tick.result.Last.toFixed(12).replace(/\.?0+$/,'') : item.PricePerUnit
          //    item.profit = (((tick.result.Last - item.PricePerUnit) / item.PricePerUnit ) * 100).toFixed(2) + '%'
              item.PricePerUnit = parseFloat(item.PricePerUnit).toFixed(12).replace(/\.?0+$/,'')
              done()
            })
      //    })
        }, function () {
          res.status(200).send(results)
        })
    })
  })
})

exports.checkHoldings = () => {
  conMongo((db) => {
    let resultsWithTicks
    const col = db.collection('holdings')
    const markets = db.collection('markets')
    col.find().toArray((err, results) => {
        async.eachLimit(results, 5, (item, done) => {
          actions.getTicks(item.marketName, function(tick) {
            markets.find({MarketName: item.marketName}).toArray((fErr, foundMarket) => {
              if (tick.result) {
                item.tick = tick.result.Last.toFixed(12).replace(/\.?0+$/,'')
                item.profit = (((tick.result.Last - item.purchasePrice) / item.purchasePrice ) * 100).toFixed(2)
                if (item.profit > 20) {
                  text.goText('sell ' + item.marketName, + ' at: ' + item.tick)
                }
              }
              done()
            })
          })
        }, function () {

        })
    })
  })
}

exports.addHolding = ((req, res) => {
  const newHolding = req.body.holding
  conMongo((db) => {
    const col = db.collection('holdings')
    col.find()
    col.update({OrderUuid: newHolding.OrderUuid}, newHolding, {upsert: true}, (err, result) => {
      if (err) {
        console.error(err)
        res.status(400).send(err)
      } else {
        res.status(200).send('added holding')
      }
    })
  })
})

exports.autoAddHolding = (closedOrders) => {
  const filteredOrders = closedOrders.filter((obj) => (obj.OrderType === 'LIMIT_BUY'))
    conMongo((db) => {
    const col = db.collection('holdings')
    filteredOrders.map((newHolding) => {
      col.find({OrderUuid: newHolding.OrderUuid}).toArray((err, rec) => {
        if (rec && rec.length === 0) {
          col.update({OrderUuid: newHolding.OrderUuid}, newHolding, {upsert: true}, (err, result) => {
            if (err) {
              console.error(err)
            } else if (result.result.nModified > 0) {
            //  sendText.goText('buy successful', newHolding.Exchange)
              console.log('added holding', newHolding.Exchange)
            }
          })
        }
      })
    })
  })
}

exports.autoAddOrders = (closedOrders) => {
  conMongo((db) => {
  const col = db.collection('orders')
  closedOrders.map((newOrder) => {
   col.find({OrderUuid: newOrder.OrderUuid}).toArray((err, rec) => {
     if (rec && rec.length === 0) {
        col.update({OrderUuid: newOrder.OrderUuid}, newOrder, {upsert: true}, (err, result) => {
          if (err) {
            console.error(err)
          } else if (result.result.nModified > 0 && newOrder.OrderType === 'LIMIT_BUY') {
            console.log('added buy order, need to auto sell', newOrder)
          }
        })
     }
   })
  })
})
}

exports.autoSellHolding = ((closedOrders) => {
  const filteredOrders = closedOrders.filter((obj) => (obj.OrderType === 'LIMIT_SELL'))
  conMongo((db) => {
    const col = db.collection('holdings')
    filteredOrders.map((newHolding) => {
      col.update({Quantity: newHolding.Quantity, Exchange: newHolding.Exchange, sold:{$exists: false}},
        {$set:{sold: true, sellPrice: newHolding.PricePerUnit, sellDate: newHolding.Closed}}, (err, result) => {
        if (err) {
          console.error(err)
        } else if (result.result.nModified > 0){
          console.log('sold holding', newHolding.Exchange)
        }
      })
    })
  })

})

exports.goodToBuy = ((req, res) => {
  const market = req.query.market
  const goodOrNot = req.query.good
  conMongo((db) => {
    const col = db.collection('markets')
    col.update({MarketName: market}, {$set: {goodToBuy: goodOrNot}}, (err, result) => {
      if (err) console.log(err)
      res.status(200).send('updated good or not')
    })
  })
})
