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
      this.accountBalances.map((bal) => {
        this.orders.map((ord) => {
          if (bal.Currency === ord.Exchange.split('-')[1] && ord.OrderType === 'LIMIT_SELL') {
            bal.OrderMade = true
            bal.OrderAmt = ord.Limit
            bal.OrderUuid = ord.OrderUuid
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
        console.log(hol.Exchange, ' : ', response.body.result.Last)
        cloneHolding.map((holding) => {
          if (holding.Exchange === hol.Exchange) {
            holding.tick = response.body.result.Last
            holding.profit = (((response.body.result.Last - holding.PricePerUnit) / holding.PricePerUnit ) * 100).toFixed(2) + '%'
          }
        })
        this.holdings = cloneHolding
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
    }, (err) => {console.error(err)})

    this.$http.get('/getBalances').then(response => {
      this.accountBalances = response.data.result
      this.accountBalances.map((bal) => {
      if (bal.dollarAmt) {
        this.grandTotal += parseFloat(bal.dollarAmt)
      }
    })
    this.grandTotal = this.grandTotal.toFixed(2)
    }, (err) => {console.error(err)})
  }
})
