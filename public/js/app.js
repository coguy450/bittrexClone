function  doSort (field, reverse, primer) {
  var key = primer ? function (x) { return primer(x[field]) } : function (x) { return x[field] }
  reverse = !reverse ? 1 : -1;
  return function (a, b) {
    return a = key(a), b = key(b), reverse * ((a > b) - (b > a))
  }
}

Vue.component('demo-grid', {
  template: '#grid-template',
  data: function () {
    return {
      sortKey: 'MarketName',
      sortOrders: {},
      gridData: null,
      gridColumns: null,
      thirtyDayHigh: null,
      thirtyDayLow: null,
      bitcoinValue: null,
      alertAmt: null,
      bitCoin50: null,
      reversed: false,
      originalGrid: [],
      originalDayGrid: [],
      discount: .95,
      newPurchaseAmt: 75
    }
  },
  methods: {
    sortBy: function (key) {
      let reverse, floater
      if (this.sortKey === key && !this.reversed) {
        reverse = true
        this.reversed = true
      } else if (this.sortKey === key && this.reversed) {
        reverse = false
        this.reversed = false
      } else {
        reverse = false
        this.reversed = false
      }
      if (key === 'MarketName' || key === 'MarketCurrencyLong') {
        floater = null
      } else {
        floater = parseFloat
      }
      this.gridData.sort(doSort(key, reverse, floater))
      this.sortKey = key
    },
    getCurrencies: function () {
      this.$http.get('/getCurrencies').then(response => {
        this.gridColumns = Object.keys(response.data[0])
        this.gridData = response.data
      }, (err) => {
        console.log(err)
      })
    },
    removeCol: function (col) {
      const ind = this.gridColumns.findIndex((obj => obj === col))
      this.gridColumns.splice(ind,1)
    },
    updateBase: function (evt) {
      this.originalGrid = this.originalGrid.length === 0 ? this.gridData : this.originalGrid
      this.gridData = this.originalGrid.filter((obj) => obj.MarketName.startsWith(evt.target.value))
    },
    updateDay: function(evt) {
      this.originalDayGrid = this.originalDayGrid.length === 0 ? this.gridData : this.originalDayGrid
      this.gridData = this.originalDayGrid.filter((obj) => parseFloat(obj.dayRng) > evt.target.value)
    },
    getSummaries: function () {
      this.$http.get('/marketSummaries').then(response => {
        this.gridColumns = Object.keys(response.data[0])

        this.gridData = response.data
      }, (err) => {
        console.log(err)
      })
    },
    updateDisc: function () {
      this.gridData.map((market) => {
        market.LastMinus5 = (market.Last * this.discount).toFixed(8).replace(/\.?0+$/,'')
      })
    },
    updatePurchaseAmt: function () {
      this.$http.get(`/getFifty?newAmt=${this.newPurchaseAmt}`).then(responseTwo => {
        this.bitCoin50 = responseTwo.body
        console.log('new 50 ', this.bitCoin50)
      }, (err) => {console.error(err)})
    },
    refreshPrice: function (coin) {
      const cloneData = this.gridData
      this.$http.post('/refreshPrice', {market: coin.MarketName}).then(response => {
        console.log(coin.MarketName, ' : ', response.body.result.Last)
        cloneData.map((holding) => {
          if (holding.MarketName === coin.MarketName) {
            holding.Last = response.body.result.Last
          }
        })
        this.gridData = cloneData
      })
    },
    getOrders: function () {
      this.$http.get(`/getOrders?historic=false`).then(response => {
        this.orders = response.body.result
        this.removeOpenOrders()
      }, (err) => {console.error(err)})
    },
    removeOrdersAndHoldings: function () {
      this.getOrders()
      this.removeHoldings()
    },
    getBitcoinValue: function () {
      this.gridData.map((m) => {
        if (m.MarketName === 'USDT-BTC') {
          this.bitcoinValue = m.Last
        }
      })
    },
    doBuy: function (market) {
      if (market.buyPrice) {
        if (parseFloat(market.buyPrice) <= parseFloat(market.Last)) {
          const buyQuantity = this.bitCoin50 / market.Last
          console.log('doing buy', market, this.bitCoin50)
          this.$http.get(`/makeOrder?market=${market.MarketName}&quantity=${buyQuantity}&price=${market.buyPrice}`)
          .then(response => {
            console.log(response)
            if (response.body.success) {
                market.buyPrice = 'BOUGHT!!'
            } else {
              market.buyPrice = 'ERROR'
            }
          })
        }
      }
    },
    removeHoldings: function () {
      this.$http.get('/getHoldings').then(response => {
        this.holdings = response.body
        this.holdings.map((hol) => {
          this.gridData.map((dat, idx) => {
            if (dat.MarketName === hol.Exchange) {
              this.gridData.splice(idx,1)
            }
          })
        })
      }, (err) => {console.error(err)})
    },
    removeOpenOrders: function () {
      this.orders.map((ord) => {
        this.gridData.map((dat, idx) => {
          if (dat.MarketName === ord.Exchange && ord.OrderType === 'LIMIT_BUY') {
            this.gridData.splice(idx,1)
          }
        })
      })
    },
    doFakeBuy: function (market) {
      const bcValue = this.getBitcoinValue()
      this.$http.get(`/doFakeBuy?market=${market.MarketName}&bcValue=${this.bitcoinValue}&price=${market.Last}`)
      .then(response => {
        console.log(response)
      })
    }
  },
  created: function () {
    this.$http.get('/marketSummaries').then(response => {
      console.log(response.data[0])
      this.gridColumns = Object.keys(response.data[0])
      this.originalGrid = response.data
      this.gridData = this.originalGrid.filter((obj) => obj.MarketName.startsWith('BTC'))

    }, (err) => {
      console.log(err)
    })
    this.$http.get('/getFifty').then(responseTwo => {
      this.bitCoin50 = responseTwo.body
      console.log('new 50 ', this.bitCoin50)
    }, (err) => {console.error(err)})

  }
})

var demo = new Vue({
  el: '#demo',
  data: {
    searchQuery: '',
    MarketCurrencyLong: null,
    key: null,
    gridData: null,
    gridColumns: {}
  }
})
var mainApp = new Vue({
  el: '#mainApp',
  data: {
    accountBalances: null
  },
  methods: {
  }
})
