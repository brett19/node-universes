// For testing distributed system, start 2 instances
var cluster = require('cluster');
if (cluster.isMaster) {
  // Fork workers.
  for (var i = 0; i < 2; i++) {
    cluster.fork();
  }
  return;
}

var consoleLog = console.log;
console.log = function() {
  var args = ['['+process.pid+']'];
  for (var i = 0; i < arguments.length; ++i) {
    args.push(arguments[i]);
  }
  consoleLog.apply(this, args);
}

// Real App
var argv = require('optimist').argv;
var EpicCluster = require('./epiccluster');
var db = require('./couchbase').mainBucket;
var bunyan = require('bunyan');
var zones = require('./zones');
var MmoApp = require('./app');

var app_name = 'node-mmo';
var log = bunyan.createLogger({ name: app_name });


var cluster = new EpicCluster(db);

cluster.on('nodeJoined', function(client) {
  console.log('nodeJoined', client.uuid);
});
cluster.on('nodeLeft', function(uuid) {
  console.log('nodeLeft', uuid);
});

return;
var app = new MmoApp(cluster);

app.get('/test', function(req, res) {
  res.send('lol');
});

// Echo command
app.cmd('echo', function(client, args) {
  client.cmd('msg', args);
});

var zoneManager = zones(app);
zoneManager.registerZone('map1', null);
zoneManager.registerZone('map2', null);
zoneManager.registerZone('cave', null);

app.start();

console.log('node is ready');
