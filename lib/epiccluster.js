var util = require('util');
var events = require('events');
var net = require('net');
var os = require('os');
var uuid = require('node-uuid');
var couchbase = require('couchbase');
var log = require('./log');

var PORT_START = 4400;

function guessBestIp() {
  var ifs = os.networkInterfaces();
  var addrs = [];
  for (var i in ifs) {
    if (ifs.hasOwnProperty(i)) {
      for (var j = 0; j < ifs[i].length; ++j) {
        if (!ifs[i][j].internal) {
          if (ifs[i][j].family === 'IPv4') {
            addrs.push(ifs[i][j].address);
          }
        }
      }
    }
  }
  return addrs[0];
}

function _Client(parent, uuid, socket) {
  var self = this;

  this.parent = parent;
  this.uuid = uuid;
  this.socket = socket;
  this.buffer = null;
  this.onMap = {};

  socket.on('connect', function() {
    self.nemit('handshake_syn', {
      uuid: self.parent.uuid
    });
  });
  socket.on('data', function(data) {
    self._onData(data);
  });
  socket.on('error', function(e) {
  });
  socket.on('close', function() {
    self.parent._unregisterNode(self);
  });

  var self = this;
  self.registered = false;
  this.non('handshake_syn', function(args) {
    if (self.uuid && self.uuid !== args.uuid) {
      throw new Error('wrong syn server uuid');
    }
    self.uuid = args.uuid;

    self.nemit('handshake_ack', {
      uuid: self.parent.uuid
    });
  });
  this.non('handshake_ack', function(args) {
    if (self.uuid !== args.uuid) {
      self.close();
      return;
    }

    self.registered = true;
    self.parent.emit('nodeJoined', self);

    self.nemit('handshake_synack');
  });
  this.non('handshake_synack', function(args) {
    self.registered = true;
    self.parent.emit('nodeJoined', self);
  });
}

_Client.prototype.close = function() {
  this.socket.end();
};

_Client.prototype.non = function(cmd, handler) {
  if (!this.onMap[cmd]) {
    this.onMap[cmd] = [];
  }
  this.onMap[cmd].push(handler);
};

_Client.prototype._nemit = function(cmd, args) {
  var handlers = this.onMap[cmd];
  if (!handlers) {
    log.warn('unknown epiccluster node message');
    return;
  }

  for (var i = 0; i < handlers.length; ++i) {
    handlers[i](args);
  }
};

_Client.prototype.nemit = function(cmd, args) {
  var dataStr = JSON.stringify([cmd, args]);
  var dataLength = Buffer.byteLength(dataStr);
  var buffer = new Buffer(2 + dataLength);
  buffer.writeInt16BE(2+dataLength, 0);
  buffer.write(dataStr, 2);
  this.socket.write(buffer);
}

_Client.prototype._onData = function(data) {
  if (!this.buffer) {
    this.buffer = data;
  } else {
    this.buffer = Buffer.concat([this.buffer, data]);
  }

  while(true) {
    if (this.buffer.length < 2) {
      break;
    }

    var packetLength = this.buffer.readUInt16BE(0);
    if (this.buffer.length < packetLength) {
      break;
    }

    var dataStr = this.buffer.toString('utf8', 2);
    var data = JSON.parse(dataStr);

    this._nemit(data[0], data[1]);

    this.buffer = this.buffer.slice(packetLength);
  }
};

function EpicCluster(db) {
  this.db = db;

  this.uuid = uuid.v4();
  this.host = guessBestIp();
  this.port = 0;

  this.nodeSweepNum = 0;
  this.nodes = [];

  this._startListening();
}
util.inherits(EpicCluster, events.EventEmitter);

EpicCluster.prototype._startListening = function() {
  var self = this;

  this.port = PORT_START;

  this.server = net.createServer();
  this.server.on('connection', function(sock) {
    self.nodes.push(new _Client(self, null, sock));
  });

  this.server.on('error', function serverError(e) {
    if (e.code === 'EADDRINUSE') {
      if (self.port > PORT_START + 100) {
        throw new Error('could not find a port to run on');
      }

      // try next port
      self.server.listen(self.port++);
    } else {
      throw e;
    }
  });
  this.server.on('listening', function() {
    log.info('EpicCluster Online as `' + self.uuid + '`@' +
        self.host + ':' + self.port);

    self._joinCluster();
  });

  this.server.listen(this.port);
};

EpicCluster.prototype._updateClusterMap = function(nodeList) {
  this.nodeSweepNum++;

  for (var i = 0; i < nodeList.length; ++i) {
    if (nodeList[i].uuid === this.uuid) {
      continue;
    }

    var found = false;
    for (var j = 0; j < this.nodes.length; ++j) {
      if (this.nodes[j].uuid === nodeList[i].uuid) {
        this.nodes[j].sweepNum = this.nodeSweepNum;
        found = true;
        break;
      }
    }

    if (!found) {
      var socket = net.connect(nodeList[i].port, nodeList[i].host);
      var client = new _Client(this, nodeList[i].uuid, socket);
      client.sweepNum = this.nodeSweepNum;
      this.nodes.push(client);
    }
  }

  for (var i = 0; i < this.nodes.length; ++i) {
    if (this.nodes[i].sweepNum !== this.nodeSweepNum) {
      this.nodes[i].close();
    }
  }
};

EpicCluster.prototype._unregisterNode = function(client) {
  var clientIdx = this.nodes.indexOf(client);
  if (clientIdx < 0) {
    return;
  }
  this.nodes.splice(clientIdx, 1);

  if (client.registered) {
    this.emit('nodeLeft', client.uuid);
  }
};

EpicCluster.prototype._joinCluster = function() {
  var self = this;

  var clusterKey = 'cluster-server';
  self.db.get(clusterKey, function(err, res) {
    var clusterList = [];
    var clusterCas = null;

    if (err) {
      if (err.code !== couchbase.errors.keyNotFound) {
        throw err;
      } else {
        // This is okay, lets continue
      }
    } else {
      clusterList = res.value;
      clusterCas = res.cas;
    }

    // Current time in seconds
    var curTime = Math.floor((new Date()).getTime() / 1000);

    var newClusterList = [];
    for (var i = 0; i < clusterList.length; ++i) {
      if (curTime >= clusterList[i].expiry) {
        continue;
      }
      if (clusterList[i].uuid === self.uuid) {
        continue;
      }
      newClusterList.push(clusterList[i]);
    }

    newClusterList.push({
      uuid: self.uuid,
      host: self.host,
      port: self.port,
      expiry: curTime + 45
    });

    self._updateClusterMap(newClusterList);

    function __handleUpdate(err) {
      if (err) {
        if (err.code !== couchbase.errors.keyAlreadyExists) {
          throw err;
        } else {
          // Try again
          return self._joinCluster();
        }
      }

      // Saved successfully!  Start again
      setInterval(function(){
        self._joinCluster();
      }, 30000);
    }
    if (clusterCas !== null) {
      self.db.set(clusterKey, newClusterList, {cas: clusterCas}, __handleUpdate);
    } else {
      self.db.add(clusterKey, newClusterList, __handleUpdate);
    }
  });
};

module.exports = EpicCluster;