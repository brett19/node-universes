var util = require('util');
var events = require('events');
var net = require('net');
var os = require('os');
var uuid = require('node-uuid');
var couchbase = require('couchbase');

var PORT_START = 2000;

/*
  1. Start listening for cluster connections
       On Connection:
         1. Do Nothing
  2. Read bootstrap list.
  3. Add self to bootstrap list.
  4. Connect to nodes in bootstrap list.
       On Connection:
         1. Handshake, sending my UUID and target UUID
         2. Receive Node-List, join list into mine and start new clients.
 */

function getMyIp() {
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

  socket.on('connect', function() {
    console.log('socket connected : ', self.uuid);

    self.send({
      cmd: 'register',
      uuid: self.parent.uuid,
      target: self.uuid
    });
  });
  socket.on('data', function(data) {
    self._onData(data);
  });
  socket.on('error', function(e) {
    console.log('sock err : ', e);
  });
  socket.on('close', function() {
    self.parent._unregisterNode(self);
  });
}

_Client.prototype._handleData = function(data) {
  if (data.cmd === 'register') {
    if (data.target !== this.parent.uuid) {
      this.socket.end();
    }
  }

  if (data.cmd === 'auth') {
    if (data.target !== this.parent.uuid) {
      this.socket.end();
    }

    setImmediate(function(){
      self.emit('auth', data.username, data.password);
    });
  }

  console.log('handle : ', data);
};

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
    this._handleData(data);

    this.buffer = this.buffer.slice(packetLength);
  }
};

_Client.prototype.send = function(data) {
  var dataStr = JSON.stringify(data);
  var dataLength = Buffer.byteLength(dataStr);
  var buffer = new Buffer(2 + dataLength);

  buffer.writeInt16BE(2+dataLength, 0);
  buffer.write(dataStr, 2);

  this.socket.write(buffer);
}

function EpicCluster(db) {
  this.db = db;

  this.uuid = uuid.v4();
  this.host = getMyIp();
  this.port = 0;

  this.nodes = [];

  // Fake it for now
  var self = this;
  setImmediate(function(){
    self.emit('init');
    self.emit('ready');
  });

  //this._startListening();
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
  this.server.on('listening', function(e) {
    self._joinCluster();
  });

  this.server.listen(this.port);
};

EpicCluster.prototype._joinCluster = function() {
  var self = this;

  console.log('I AM : ', self.uuid, self.host, self.port);

  self.db.get('cluster-servers', function(err, res) {
    if (err) {
      if (err.code !== couchbase.errors.keyNotFound) {
        throw err;
      } else {
        self.db.add('cluster-servers', [[self.uuid, self.host, self.port]], function(err, res) {
          if (err) {
            throw err;
          }

          self.emit('init');
          self.emit('ready');
        });
      }
      return;
    }

    var serverList = res.value;
    serverList.push([self.uuid, self.host, self.port]);

    self.db.set('cluster-servers', serverList, {cas: res.cas}, function(err, res) {
      if (err) {
        throw err;
      }

      for (var i = 0; i < serverList.length; ++i) {
        self._registerNode(serverList[i]);
      }
    });
  });
};

EpicCluster.prototype._registerNode = function(nodeInfo) {
  if (nodeInfo[0] === this.uuid) {
    // This node is me...
    return;
  }

  for (var i = 0; i < this.nodes.length; ++i) {
    if (this.nodes[i].uuid === nodeInfo[0]) {
      // We already know about this node
      return;
    }
  }

  console.log('REGISTERED : ', nodeInfo);

  var socket = net.connect(nodeInfo[2], nodeInfo[1]);
  this.nodes.push(new _Client(this, nodeInfo[0], socket));
};

EpicCluster.prototype._unstrapNode = function(uuid) {
  var self = this;

  self.db.get('cluster-servers', function(err, res) {
    if (err) {
      throw err;
    }

    var serverList = res.value;
    var newServerList = [];
    for (var i = 0; i < serverList.length; ++i) {
      if (serverList[i][0] !== uuid) {
        newServerList.push(serverList[i]);
      }
    }
    self.db.set('cluster-servers', newServerList, {cas: res.cas}, function(err, res) {
      if (err) {
        if (err.code !== couchbase.errors.keyAlreadyExists) {
          throw err;
        } else {
          // Try Again
          self._unstrapNode(uuid);
          return;
        }
      }

      // Good to go!
    });
  });
};

EpicCluster.prototype._unregisterNode = function(client) {
  var self = this;

  console.log('UNREGISTERED : ', client.uuid);

  this._unstrapNode(client.uuid);

  var nodeIdx = self.nodes.indexOf(client);
  if (nodeIdx < 0) {
    throw new Error('node missing from nodes list');
  }

  self.nodes.splice(nodeIdx, 1);
};

EpicCluster.prototype.nodeList = function() {
  var nodeList = [];
  for (var i = 0; i < this.nodes.length; ++i) {
    nodeList.push(this.nodes[i].uuid);
  }
  return nodeList;
};

module.exports = EpicCluster;