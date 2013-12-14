// Real App
var argv = require('optimist').argv;
var EpicCluster = require('./epiccluster');
var db = require('./couchbase').mainBucket;
var zones = require('./zones');
var MmoApp = require('./app');
var log = require('./log');

var cluster = new EpicCluster(db);

cluster.on('nodeJoined', function(client) {
  log.info('nodeJoined', client.uuid);
});
cluster.on('nodeLeft', function(uuid) {
  log.info('nodeLeft', uuid);
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
