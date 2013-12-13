var fs = require('fs');
var crypto = require('crypto'); // TODO: Look into ursa module
var uuid = require('node-uuid');
var config = require('yaml-config').readConfig('./config/crypto.yml');

function Crypto(logger) {
   this.log = logger.child({ lib: 'Crypto' });

   self = this;
}

Crypto.UUID = function() {
   return uuid.v4();
}

Crypto.Sign = function(data) {
   return crypto
            .createSign(config.signer)
            .update(data)
            .sign( fs.readFileSync(config.private_key_file), config.format );
}

Crypto.Verify = function(data, signature) {
   return crypto
            .createVerify(config.signer)
            .update(data)
            .verify( fs.readFileSync(config.public_key_file), signature, config.format );
}

module.exports = Crypto;