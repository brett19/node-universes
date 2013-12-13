var util = require('util');
var events = require('events');
var Primus = require('primus')
var http = require('http');
var express = require('express');

function MmoApp(cluster) {
  this.cluster = cluster;

  var app = express();
  app.use('/client', express.static(__dirname + '/../public/client'));

  var server = http.createServer(app);
  var primus = new Primus(server, { transformer: 'engine.io' });

  primus.on('connection', function (spark) {
    spark.on('data', function(data) {
      if (data.cmd === 'echo') {
        spark.write({cmd: 'msg', msg: data.msg});
      }
    });
  });

  this.express = app;
  this.server = server;
  this.primus = primus;

  server.listen(2000);
}
util.inherits(MmoApp, events.EventEmitter);

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
