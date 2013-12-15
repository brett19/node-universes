var core = require('./core');
var Primus = require('primus');

function WebSockets(app) {
  this.app = app;

  var primus = new Primus(app.server, { transformer: 'engine.io' });

  var self = this;
  primus.on('connection', function (spark) {
    spark.uuid = core.uuid();
    spark.nemit = function(cmd, args) {
      spark.write([cmd, args]);
    };
    spark.on('data', function(data) {
      self.app._nemit(self, data[0], data[1]);
    });
    self.app.emit('clientJoined', spark);
  });
  primus.on('disconnection', function (spark) {
    self.app.emit('clientLeft', spark);
  });

  this.server = primus;
}

module.exports = WebSockets;
