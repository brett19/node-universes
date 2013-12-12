var util = require('util');
var events = require('events');
var net = require('net');
var os = require('os');
var uuid = require('node-uuid');

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
  this.parent = parent;
  this.uuid = uuid;
  this.socket = socket;
}

_Client.prototype.host = function() {
  return this.socket.address().address;
};

_Client.prototype.port = function() {
  return this.socket.address().port;
};

function EpicCluster(db) {
  this.db = db;
  this.nodes = [];

  this._createServer();
}
util.inherits(EpicCluster, events.EventEmitter);

EpicCluster.prototype._createServer = function() {
  var self = this;

  this.serverPort = PORT_START;

  this.server = net.createServer();
  this.server.on('error', function serverError(e) {
    if (e.code === 'EADDRINUSE') {
      if (self.serverPort > PORT_START + 100) {
        throw new Error('could not find a port to run on');
      }

      // try next port
      self.server.listen(self.serverPort++);
    } else {
      throw e;
    }
  });
  this.server.on('listening', function(e) {
    self._bootstrap();
  });

  this.server.listen(this.serverPort);
};

EpicCluster.prototype._bootstrap = function() {
  this.db.get('cluster-servers', function(err, res) {

  });
};

EpicCluster.prototype.nodeList = function() {
  var nodeList = [];
  for (var i = 0; i < this.nodes.length; ++i) {
    nodeList.push([
      this.nodes[i].uuid,
      this.nodes[i].host(),
      this.nodes[i].port()
    ]);
  }
  return nodeList;
};


module.exports = EpicCluster;