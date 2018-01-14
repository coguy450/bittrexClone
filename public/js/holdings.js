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
            console.log('found market', holding)
            holding.tick = response.body.result.Last
            holding.profit = (((response.body.result.Last - holding.PricePerUnit) / holding.PricePerUnit ) * 100).toFixed(2) + '%'
            console.log('holding after', holding.tick)
          }
        })
        this.holdings = cloneHolding.slice()
      })
    },
    addHoldingsToBals: function () {
      this.accountBalances.map((bal) => {
        this.holdings.map((hol) => {
          const ex = hol.Exchange.split('-')[1]
          if (ex === bal.Currency) {
            hol.tick = bal.Last
            hol.dollarAmt = bal.dollarAmt
            hol.Balance = bal.Balance
            hol.profit = (((bal.Last - hol.PricePerUnit) / hol.PricePerUnit ) * 100).toFixed(2) + '%'
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
        const findHold = this.holdings.filter((hol) => hol.Exchange.split('-')[1] === act.Currency)
        if (findHold.length === 0 && act.Balance > 0 && act.Currency !== 'SBD' && act.Currency !== 'USDT') {
        //  location.href = '/closed'
        }
      })
      this.holdings.map((hol) => {
        const findAct = this.accountBalances.filter((act) => hol.Exchange.split('-')[1] === act.Currency)
        if (findAct.length === 0 ) {
          console.log('findAct length 0')
        //  location.href = '/closed'
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
    // /  console.log(this.holdings)
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
