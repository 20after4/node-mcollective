var mco = require('./lib/mcollective')

var req = new mco.Request('service', 'status')

req.timeout(10)
req.discoveryTimeout(3)

req.agentFilter('service')
req.classFilter('mcollective')
req.factFilter('fqdn', process.env.HOSTNAME)
req.identityFilter(process.env.HOSTNAME)

var res = req.send({ service: 'mcollective' })

res.on('data', function(data) {
  console.log(data)
})

res.on('error', function(err) {
  console.log('err: ' + err)
})

res.on('end', function() {
  console.log('done')
})
