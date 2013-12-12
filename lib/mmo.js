var argv = require('optimist').argv;
var EpicCluster = require('./epiccluster');
var db = require('./couchbase').mainBucket;
var bunyan = require('bunyan');

var app_name = 'node-mmo';
var log = bunyan.createLogger({ name: app_name });

var cluster = new EpicCluster(db);
cluster.on('ready', function() {
  // Not Called Yet
});