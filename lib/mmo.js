var argv = require('optimist').argv;
var EpicCluster = require('./epiccluster');

var db = require('./couchbase').mainBucket;

var cluster = new EpicCluster(db);
cluster.on('ready', function() {
  // Not Called Yet
});