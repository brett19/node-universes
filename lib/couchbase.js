var couchbase = require('couchbase');
var config = require('yaml-config').readConfig('./config/couchbase.yml');

module.exports.mainBucket = new couchbase.Connection({
   host: config.mainBucket.server,
   bucket: config.mainBucket.bucket,
   password: config.mainBucket.password
});
