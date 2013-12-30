var cluster = require('cluster');
var appSingleton = null;

module.exports = function(opts, handler) {
  if (opts instanceof Function) {
    handler = opts;
    opts = {};
  }
  if (!handler) {
    // TODO: Return universes app instance
    return appSingleton;
  }

  if (opts.workers === undefined) {
    opts.workers = require('os').cpus().length;;
  }

  if (opts.workers > 1) {
    if (cluster.isMaster) {
      for (var i = 0; i < opts.workers; i++) {
        cluster.fork({portOffset: i * 50});
      }
      return;
    }
  }

  if (cluster.isWorker) {
    process.portOffset = parseInt(process.env.portOffset);
  } else {
    process.portOffset = 0;
  }

  if (!appSingleton) {
    var MmoApp = require('./app');
    appSingleton = new MmoApp(opts);

    appSingleton.Core = require('./core');
    appSingleton.Primus = require('./primus');
    appSingleton.Rooms = require('./rooms');
    appSingleton.Zones = require('./zones');
    appSingleton.logger = require('./logger');

    appSingleton.cluster.on('ready', function() {
      handler(appSingleton);
    });
  }
};
