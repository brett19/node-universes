var argv = require('optimist').argv;
var EpicCluster = require('./epiccluster');
var db = require('./couchbase').mainBucket;
var bunyan = require('bunyan');
var SocketAuth = require('./socketauth');

var app_name = 'node-mmo';
var log = bunyan.createLogger({ name: app_name });

var cluster = new EpicCluster(db);

cluster.on('init', function() {
  log.info('Bringing up cluster node');

});

cluster.on('ready', function() {
  log.info('Server node is ready');

  // TODO: Receive username and password from client
  var username = 'jdoe';
  var password = 'j1doe';

  SocketAuth(log);
  SocketAuth.Authenticate(username, password, function(err, sessionid) {
    
    if (err) {
      log.error('Authentication failed for ' + username);
      return;
    }

    log.info('Successful authentication for ' + username + ' (' + sessionid + ')');
  });
});