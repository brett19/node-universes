var util = require('util');
var events = require('events');
var http = require('http');
var express = require('express');
var couchbase = require('couchbase');
var core = require('./core');
var EpicCluster = require('./epiccluster');

function MmoApp(options) {
  this.db = new couchbase.Connection(options.couchbase);
  this.cluster = new EpicCluster(this.db);

  this.httpPort = options.httpPort ? options.httpPort : 2000;

  this.express = express();
  this.server = http.createServer(this.express);

  this.onMap = {};
}
util.inherits(MmoApp, events.EventEmitter);

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

MmoApp.prototype.nemit = function(cmd, args) {
  throw new Error('Not Supported Yet');
};

MmoApp.prototype.start = function() {
  this.server.listen(this.httpPort);

  this.emit('ready');
};

module.exports = MmoApp;
