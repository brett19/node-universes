var db = require('./couchbase').mainBucket;
var Crypto = require('./crypto');
var fs = require('fs');
var crypto = require('crypto'); // TODO: Look into ursa module
var uuid = require('node-uuid');
var config = require('yaml-config').readConfig('./config/crypto.yml');

function SocketAuth(logger) {
   this.log = logger.child({ lib: 'SocketAuth' });

   self = this;
}

SocketAuth.Authenticate = function(username, password, callback) {

   self.log.info('Authenticating ' + username);

   // TODO: Perform authentication here (treat password as encrypted)
   var err = null;

   if (err) {
      self.log.info('Authentication failed for %s: %s', username, err);
      return callback(err);
   }

   // Sign UUID
   var sessionid = Crypto.UUID();
   var signature = Crypto.Sign(sessionid);
   var verified = Crypto.Verify(sessionid, signature);

   self.log.info('UUID: %s', sessionid);
   self.log.info('Signature: ' + signature);
   self.log.info('Signature is valid: ' + verified);

   callback(null, sessionid, signature);
}

module.exports = SocketAuth;