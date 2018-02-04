var talib = require('talib');

// console.log(talib.explain('MOM'));

exports.transformData = (data) => {
  return new Promise((resolve, reject) => {
    const lowArray = []
    const highArray = []
    const closeArray = []

    data.map((obj) => {
      lowArray.push(obj.L)
      highArray.push(obj.H)
      closeArray.push(obj.C)
    })

    doCMO(lowArray, highArray, closeArray).then(result => {
      doAnalysis(lowArray, highArray, closeArray, result).then(daResult => {
        resolve(daResult)
      })
    })
  })
}

function doAnalysis (low, high, close, resObj) {
  return new Promise((resolve, reject) => {
    talib.execute({
      name: 'DX',
      startIdx: 0,
      endIdx: close.length - 1,
    //  inReal: close,
      high: high,
      low: low,
      close: close,
      optInTimePeriod: 9
    }, function (err, result) {
        if (err) console.log(err)
      //  console.log("DX Function Results:");
        if (result.result) {
          const newData = result.result.outReal.slice(result.result.outReal.length - 1)
          resObj.DX = newData[0].toFixed(2)
          resolve(resObj);
        }
    });
  })
}


function doCMO (low, high, close) {
  return new Promise((resolve, reject) => {
    talib.execute({
      name: 'CMO',
      startIdx: 0,
      endIdx: close.length - 1,
      inReal: close,
      // high: high,
      // low: low,
      // close: close,
      optInTimePeriod: 9,
    }, function (err, result) {
      if (err) {
        console.log(err)
        resolve(null)
      }

      if (result.result) {
        const newData = result.result.outReal.slice(result.result.outReal.length - 1)

        resolve({CMO: newData[0].toFixed(2)})
      }
    });
  })
}
