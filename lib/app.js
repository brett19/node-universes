var util = require('util');
var events = require('events');
var http = require('http');
var express = require('express');
var core = require('./core');

function MmoApp(cluster) {
  this.cluster = cluster;

  this.express = express();
  this.server = http.createServer(this.express);

  this.onMap = {};
}
util.inherits(MmoApp, events.EventEmitter);

MmoApp.prototype.static = function(path, fspath) {
  this.express.use(path, express.static(fspath));
};

MmoApp.prototype.rest = function(path) {
  this.express.use.apply(this.express, arguments);
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
  this.server.listen(2000);

  this.emit('ready');
};

module.exports = MmoApp;
