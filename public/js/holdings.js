var mainApp = new Vue({
  el: '#holdings',
  data: {
    holdings: null,
    orders: null,
    accountBalances: null,
    closedOrders: null,
    grandTotal: 0,
    bitCoin50: null,
    buyOrders: true,
    orderFilter: 'LIMIT_BUY',
  },
  methods: {
    doOrderMap: function () {
      this.holdings.map((hol) => {
        this.orders.map((ord) => {
          if (hol.Exchange === ord.Exchange && ord.OrderType === 'LIMIT_SELL') {
            hol.OrderMade = true
            hol.OrderAmt = ord.Limit
            hol.OrderUuid = ord.OrderUuid
          }
        })
      })
    },
    toggleSell: function() {
      this.buyOrders = !this.buyOrders
      this.orderFilter = this.orderFilter === 'LIMIT_BUY' ? 'LIMIT_SELL' : 'LIMIT_BUY'
    },
    refreshPrice: function (hol) {
      const cloneHolding = this.holdings
      this.$http.post('/refreshPrice', {market: hol.Exchange}).then(response => {
        cloneHolding.map((holding) => {
          if (holding.Exchange === hol.Exchange) {
            holding.tick = response.body.result.Last
            holding.profit = (((response.body.result.Last - holding.PricePerUnit) / holding.PricePerUnit ) * 100).toFixed(2) + '%'
          }
        })
        this.holdings = cloneHolding
      })
    },
    addHoldingsToBals: function () {
      this.accountBalances.map((bal) => {
        this.holdings.map((hol) => {
          const ex = hol.Exchange.split('-')[1]
          if (ex === bal.Currency) {
            hol.dollarAmt = bal.dollarAmt
            hol.Balance = bal.Balance
          }
        })
      if (bal.dollarAmt) {
        this.grandTotal += parseFloat(bal.dollarAmt)
      }
      })
      this.grandTotal = this.grandTotal.toFixed(2)
      this.checkForMissingHoldings()
    },
    checkForMissingHoldings: function () {
      this.accountBalances.map((act) => {
        if (act.dollarAmt === undefined) {
          console.log('this is missing from holdings', act)
        }
      })
    },
    getOrders: function (historic) {
      this.$http.get(`/getOrders?historic=${historic}`).then(response => {
        if (historic) {
          this.closedOrders = response.body.result
        } else {
          this.orders = response.body.result
          this.doOrderMap()
        //  console.log(this.accountBalances)
        }
      }, (err) => {console.error(err)})
    },
    cancelOrder: function (order) {
      console.log(order)
      this.$http.get(`/cancelOrder?cancelId=${order.OrderUuid}`).then(response => {
        this.orders = response.body.result
        this.doOrderMap()
      }, (err) => {console.error(err)})
    },
    addToHoldings: function (holding) {
      this.$http.post('/addHolding', {holding: holding}).then(response => {

      })
    }
  },
  created: function () {
    this.$http.get('/getHoldings').then(response => {
      this.holdings = response.body
      console.log(this.holdings)
      if (this.accountBalances) {
        this.addHoldingsToBals()
      }
    }, (err) => {console.error(err)})

    this.$http.get('/getBalances').then(response => {
      this.accountBalances = response.data.result
      if (this.holdings) {
        this.addHoldingsToBals()
      }

    }, (err) => {console.error(err)})
  }
})
