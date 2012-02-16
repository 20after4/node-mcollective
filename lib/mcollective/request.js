var child_process = require('child_process')
  , events = require('events')
  , path = require('path')
  , mc_send = path.join(__dirname, '..', '..', 'misc', 'mc-send')

function Request(agent, action) {
  this._agent = agent
  this._action = action
  this._agentFilter = []
  this._classFilter = []
  this._factFilter = []
  this._identityFilter = []
  this._discoveryTimeout = 5
  this._timeout = 60
  this._clientConf = '/etc/mcollective/client.cfg'
}

exports.Request = Request

Request.prototype.clear = function() {
  this.clearAgentFilter()
  this.clearClassFilter()
  this.clearFactFilter()
  this.clearIdentityFilter()
}

Request.prototype.clearAgentFilter = function() {
  this._agentFilter = []
}

Request.prototype.clearClassFilter = function() {
  this._classFilter = []
}

Request.prototype.clearFactFilter = function() {
  this._factFilter = []
}

Request.prototype.clearIdentityFilter = function() {
  this._identityFilter = []
}

Request.prototype.agentFilter = function(value) {
  if (typeof(value) !== 'string')
    throw new Error('agent must be a string')
  this._agentFilter.push(value)
}

Request.prototype.classFilter = function(value) {
  if (typeof(value) !== 'string')
    throw new Error('class must be a string')
  this._classFilter.push(value)
}

Request.prototype.factFilter = function(name, value) {
  if (typeof(name) !== 'string')
    throw new Error('fact name must be a string')
  if (typeof(value) !== 'string')
    throw new Error('fact value must be a string')
  this._factFilter.push([name, value])
}

Request.prototype.identityFilter = function(value) {
  if (typeof(value) !== 'string')
    throw new Error('identity must be a string')
  this._identityFilter.push(value)
}

Request.prototype.timeout = function(value) {
  if (value === undefined)
    return this._timeout = 60
  if (typeof(value) !== 'number')
    throw new Error('timeout must be a number')
  this._timeout = parseInt(value)
}

Request.prototype.discoveryTimeout = function(value) {
  if (value === undefined)
    return this._timeout = 60
  if (typeof(value) !== 'number')
    throw new Error('discovery timeout must be a number')
  this._discoveryTimeout = parseInt(value)
}

Request.prototype.clientConf = function(value) {
  if (value === undefined)
    return this._clientConf = '/etc/mcollective/client.cfg'
  if (typeof(value) !== 'string')
    throw new Error('client conf must be a string')
  this._clientConf = value
}

Request.prototype.send = function(data) {
  if (typeof(data) !== 'object')
    throw new Error('data must be an object')

  var e = new events.EventEmitter()
    , p = child_process.spawn(mc_send)
    , buffer = { stdout: [], stderr: [] }
    , end = false

  var close = function (code) {
    if (end) return
    end = true
    e.emit('end', code)
  }

  var handleInput = function(name, data) {
    data = data.toString('utf8')
    if (data.indexOf("\n") >= 0) {
      data = buffer[name].join('') + data
      try {
        if (name == 'stdout') {
          e.emit('data', JSON.parse(data))
        } else {
          e.emit('error', data)
        }
      } catch (err) {
        // ignore errors
      }
      buffer[name] = []
    } else {
      buffer[name].push(data)
    }
  }

  var timeout = setTimeout(function() {
    close(255)
  }, (this._timeout + this._discoveryTimeout + 10) * 1000)

  p.stdout.on('data', function (data) { handleInput('stdout', data) })
  p.stderr.on('data', function (data) { handleInput('stderr', data) })

  p.on('exit', close)

  p.stdin.end(JSON.stringify({
    'agent': this._agent,
    'action': this._action,
    'options': {
      'discovery_timeout': this._discoveryTimeout,
      'timeout': this._timeout,
      'client_conf': this._clientConf,
    },
    'filter': {
      'agent': this._agentFilter,
      'class': this._classFilter,
      'fact': this._factFilter,
      'identity': this._identityFilter,
    },
    'data': data,
  }))

  return e
}
