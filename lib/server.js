var argv = require('optimist').argv;
var db = require('./couchbase').mainBucket;
var log = require('./log');
var EpicCluster = require('./epiccluster');
var MmoApp = require('./app');

var cluster = new EpicCluster(db);
var app = new MmoApp(cluster);

app.on('ready', function() {
  log.info('Server Ready');
});

app.start();
