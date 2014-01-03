var util = require('util');
var events = require('events');
var http = require('http');
var express = require('express');
var couchbase = require('couchbase');
var core = require('./core');
var EpicCluster = require('./epiccluster');
var log = require('./logger');

function MmoApp(options, callback) {
  this.db = new couchbase.Connection(options.couchbase);
  this.cluster = new EpicCluster(this.db, callback);

  this.httpPort = options.httpPort ? options.httpPort : 2000;
  this.selfPort = options.selfPort ? options.selfPort : 4000;

  this.selfPort += process.portOffset;

  this.express = express();
  this.server = http.createServer(this.express);

  this.onMap = {};
  this.services = {};
  this.peers = {};
  this.clientCount = 0;

  this.get('/debug', this._restDebug.bind(this));

  this.service('cluster', this.cluster);
  this.service('core', this);

  this.on('clientJoined', (function(){ this.clientCount++; }).bind(this) );
  this.on('clientLeft', (function(){ this.clientCount--; }).bind(this) );

  this.cluster.on('nodeJoined', function(client) {
    log.debug('nodeJoined', client.uuid);
    this.peers[client.uuid] = {
      host: null,
      port: null,
      services: []
    };

    client.nemit('core/identify', {host: this.cluster.host, port: this.selfPort});
    for (var i in this.services) {
      if (this.services.hasOwnProperty(i)) {
        client.nemit('core/addService', {id: i});
      }
    }
  }.bind(this));
  this.cluster.on('nodeLeft', function(uuid) {
    log.debug('nodeLeft', uuid);
    delete this.peers[uuid];
  }.bind(this));
  this.cluster.non('core/identify', function(client, args) {
    this.peers[client.uuid].host = args.host;
    this.peers[client.uuid].port = args.port;
  }.bind(this));
  this.cluster.non('core/addService', function(client, args) {
    if (this.peers[client.uuid].services.indexOf(args.id) < 0) {
      this.peers[client.uuid].services.push(args.id);
    }
  }.bind(this));
  this.cluster.non('core/removeService', function(client, args) {
    var serviceIdx = this.peers[client.uuid].services.indexOf(args.id);
    if (serviceIdx >= 0) {
      this.peers[client.uuid].services.splice(serviceIdx, 1);
    }
  }.bind(this));
}
util.inherits(MmoApp, events.EventEmitter);

MmoApp.prototype.debugInfo = function() {
  return {
    client_count: this.clientCount,
    globalPort: this.httpPort,
    selfPort: this.selfPort,
    peers: this.peers
  };
};

MmoApp.prototype._restDebug = function(req, res, next) {
  var out = {};

  out.services = {};
  for (var i in this.services) {
    if (this.services.hasOwnProperty(i)) {
      out.services[i] = this.services[i].debugInfo();
    }
  }

  res.send(out);
};

MmoApp.prototype.service = function(id, obj) {
  if (obj === null) {
    this.cluster.nemit('core/removeService', {id: id});
    delete this.services[id];
  } else if (obj !== undefined) {
    this.cluster.nemit('core/addService', {id: id});
    this.services[id] = obj;
  }
  return this.services[id];
};

MmoApp.prototype.static = function(path, fspath) {
  this.express.use(path, express.static(fspath));
};

MmoApp.prototype.get = function(path) {
  this.express.get.apply(this.express, arguments);
};
MmoApp.prototype.post = function(path) {
  this.express.post.apply(this.express, arguments);
};
MmoApp.prototype.put = function(path) {
  this.express.put.apply(this.express, arguments);
};
MmoApp.prototype.del = function(path) {
  this.express.del.apply(this.express, arguments);
};

MmoApp.prototype._nemit = function(client, cmd, args) {
  this.emit('packet', client, cmd, args);

  var handlers = this.onMap[cmd];
  if (handlers) {
    for (var i = 0; i < handlers.length; ++i) {
      handlers[i](client, args);
    }
  }
};

MmoApp.prototype.non = function(cmd, handler) {
  if (!this.onMap[cmd]) {
    this.onMap[cmd] = [];
  }
  this.onMap[cmd].push(handler);
};

MmoApp.prototype._tryListen = function(port, step, callback) {
  var doCallback = function() {
    this.server.removeListener('error', errorHandler);
    this.server.removeListener('listening', listenHandler);
    callback.apply(this, arguments);
  }.bind(this);

  var errorHandler = function(e) {
    if (!step || e.code !== 'EADDRINUSE') {
      doCallback(e, 0);
    } else {
      port++;
      this.server.listen(port);
    }
  }.bind(this);
  var listenHandler = function() {
    doCallback(null, port);
  }.bind(this);

  this.server.addListener('error', errorHandler);
  this.server.addListener('listening', listenHandler);

  // Try to listen
  this.server.listen(port);
};

MmoApp.prototype.start = function() {
  this._tryListen(this.selfPort, true, function(err, port) {
    if (err) throw err;
    this.selfPort = port;
    this._tryListen(this.httpPort, false, function(err, port) {
      if (err) throw err;
      this.httpPort = port;
      this.emit('ready');
    }.bind(this));
  }.bind(this));
};

module.exports = MmoApp;
