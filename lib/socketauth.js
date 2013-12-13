var fs = require('fs');
var db = require('./couchbase').mainBucket;
var crypto = require('crypto'); // TODO: Look into ursa module
var uuid = require('node-uuid');
var config = require('yaml-config').readConfig('./config/default.yml');

function SocketAuth(logger) {
   this.log = logger.child({ model: 'GeneralInfoModel' });

   self = this;
}

SocketAuth.Sign = function(data) {
   var signer = crypto.createSign(config.socketauth.algorithm);
   signer.write(data, 'utf8');

   return signer.sign( fs.readFileSync(config.socketauth.private_key_file), config.socketauth.format );
}

SocketAuth.Verify = function(data, signature) {
   var verifier = crypto.createVerify(config.socketauth.algorithm);
   verifier.update(data);

   return verifier.verify( fs.readFileSync(config.socketauth.public_key_file), signature, config.socketauth.format );
}

SocketAuth.Authenticate = function(username, password, callback) {

   self.log.info('Authenticating ' + username);

   // TODO: Perform authentication here
   var err = null;

   if (err) {
      self.log.info('Authentication failed for %s: %s', username, err);
      return callback(err);
   }

   // Sign UUID
   var sessionid = uuid.v4();
   var signature = this.Sign(sessionid);
   // var verified = this.Verify(sessionid, signature);

   self.log.info('UUID: %s', sessionid);
   // self.log.info('Signature: ' + signature);
   // self.log.info('Signature is valid: ' + verified);

   callback(null, sessionid, signature);
}

module.exports = SocketAuth;