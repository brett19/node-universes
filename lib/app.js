var util = require('util');
var events = require('events');
var Primus = require('primus')
var http = require('http');
var express = require('express');
var core = require('./core');

function MmoApp(cluster) {
  var self = this;

  this.cluster = cluster;

  var app = express();
  app.use('/client', express.static(__dirname + '/../public/client'));

  var server = http.createServer(app);
  var primus = new Primus(server, { transformer: 'engine.io' });

  primus.on('connection', function (spark) {
    spark.cmd = function(cmd, args) {
      spark.write([cmd, args]);
    };
    spark.on('data', function(data) {
      if (!Array.isArray(data)) {
        console.log('data is not an array : ', data);
        return;
      }
      self._emitCmd(spark, data[0], data[1]);
    });
    self.emit('clientJoin', spark);
  });
  primus.on('disconnection', function (spark) {
    self.emit('clientLeave', spark);
  });

  this.express = app;
  this.server = server;
  this.primus = primus;
  this.cmdMap = {};

  this.clients = [];
  this.players = [];
  this.on('clientJoin', function(client) {
    self.clients.push(client);
  });
  this.on('clientLeave', function(client) {
    var clientIdx = self.clients.indexOf(client);
    if (clientIdx >= 0) {
      self.clients.splice(clientIdx, 1);
    }

    for (var i = 0; i < self.players.length; ++i) {
      if (self.players[i].uuid === client.uuid) {
        self.players.splice(i, 1);
        break;
      }
    }

    for (var i = 0; i < self.clients.length; ++i) {
      self.clients[i].cmd('delplayer', {
        uuid: client.uuid
      });
    }
  });
  this.cmd('join', function(client, args) {
    console.log('JOIN COMMAND');

    client.uuid = core.uuid();
    args.uuid = client.uuid;
    self.players.push(args);

    for (var i = 0; i < self.clients.length; ++i) {
      var oClient = self.clients[i];
      if (oClient.uuid && oClient.uuid !== client.uuid) {
        oClient.cmd('addplayer', args);
      }
    }

    for (var i = 0; i < self.players.length; ++i) {
      var oPlayer = self.players[i];
      if (oPlayer.uuid !== client.uuid) {
        client.cmd('addplayer', oPlayer);
      }
    }

    client.cmd('joined', {uuid: client.uuid});
  });
  this.cmd('moveTo', function(client, args) {
    for (var i = 0; i < self.players.length; ++i) {
      if (self.players[i].uuid === client.uuid) {
        self.players[i].x = args.x;
        self.players[i].y = args.y;
      }
    }
    for (var i = 0; i < self.clients.length; ++i) {
      var oClient = self.clients[i];
      if (oClient.uuid && oClient.uuid !== client.uuid) {
        oClient.cmd('moveTo', {
          uuid: client.uuid,
          x: args.x,
          y: args.y
        });
      }
    }
  });

  server.listen(2000);
}
util.inherits(MmoApp, events.EventEmitter);

MmoApp.prototype._emitCmd = function(client, name, args) {
  var callChain = this.cmdMap[name];
  if (!callChain) {
    console.log('unrecognized command : ' + name);
    return;
  }
  var callIdx = 0;
  function next() {
    if (callIdx < callChain.length) {
      var nextFunc = callChain[callIdx];
      callIdx++;
      nextFunc(client, args, next);
    } else {
      throw new Error('end of call chain reached');
    }
  }
  next();
};

MmoApp.prototype.cmd = function(name, args) {
  var callChain = [];
  for (var i = 1; i < arguments.length; ++i) {
    callChain.push(arguments[i]);
  }
  this.cmdMap[name] = callChain;
}
MmoApp.prototype.get = function(path, args) {
  this.express.get.apply(this.express, arguments);
};
MmoApp.prototype.post = function(path, args) {
  this.express.post.apply(this.express, arguments);
};
MmoApp.prototype.put = function(path, args) {
  this.express.put.apply(this.express, arguments);
};

MmoApp.prototype.start = function() {
  this.emit('start');
};

module.exports = MmoApp;
