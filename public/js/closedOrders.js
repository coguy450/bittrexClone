var closedOrders = new Vue({
  el: '#closedOrders',
  data: {
    orders: null,
    accountBalances: null,
    closedOrders: null,
    salePrice: null,
    free: {},
    buyOrders: true,
    orderFilter: 'LIMIT_BUY',
  },
  methods: {
    getOrders: function (historic) {
      this.$http.get(`/getOrders?historic=${historic}`).then(response => {
        if (historic) {
          this.closedOrders = response.body.result
        } else {
          this.orders = response.body.result
          this.accountBalances.map((bal) => {
            this.orders.map((ord) => {
              if (bal.Currency === ord.Exchange.split('-')[1]) {
                console.log('found', bal.Currency)
                bal.OrderMade = true
                bal.OrderAmt = ord.Limit
              }
            })
          })
          console.log(this.accountBalances)
        }
      }, (err) => {console.error(err)})
    },
    cancelOrder: function (order) {
      this.$http.get(`/cancelOrder?cancelId=${order.OrderUuid}`).then(response => {
        this.orders = response.body.result
      }, (err) => {console.error(err)})
    },
    toggleSell: function() {
      this.buyOrders = !this.buyOrders
      this.orderFilter = this.orderFilter === 'LIMIT_BUY' ? 'LIMIT_SELL' : 'LIMIT_BUY'
    },
    sellOrder: function (c) {
      const sellPrice = (parseFloat(c.PricePerUnit) * c.profitPercent) + parseFloat(c.PricePerUnit) + ((c.Commission * 2)/c.Quantity)
      this.$http.post('/sellOrder', {
        market: c.Exchange,
        quantity: c.Quantity,
        sellPrice: sellPrice,
      }).then(response => {
        console.log('sell order place', response)
      })
    },
    addToHoldings: function (holding) {
      this.$http.post('/addHolding', {holding: holding}).then(response => {

      })
    }
  },
  created: function () {
    this.getOrders(true)
  }
})
