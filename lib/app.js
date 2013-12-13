var util = require('util');
var events = require('events');
var Primus = require('primus')
var http = require('http');
var express = require('express');

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
      self._emitCmd(spark, data[0], data[1]);
    });
  });
  primus.on('disconnection', function (spark) {

  });

  this.express = app;
  this.server = server;
  this.primus = primus;
  this.cmdMap = {};

  server.listen(2000);
}
util.inherits(MmoApp, events.EventEmitter);

MmoApp.prototype._emitCmd = function(client, name, args) {
  var callChain = this.cmdMap[name];
  var callIdx = 0;
  function next() {
    if (callIdx++ < callChain.length) {
      var nextFunc = callChain[callIdx];
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
