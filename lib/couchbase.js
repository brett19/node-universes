var couchbase = require('couchbase');
var cb_server = '127.0.0.1:8091';
var cb_bucket = 'default';
var cb_password = '';

module.exports.mainBucket = new couchbase.Connection({host: cb_server, bucket: cb_bucket, password: cb_password});
