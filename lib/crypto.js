/*
 * Crypto Module 1.0
 * @author Matt Borja (rdev5)
 *
 * Featured methods:
 * - UUID
 * - Sign() and Verify()
 * - Cipher() and Decipher()
 * - Pack() and Unpack()
 * - GenerateIV()
 * - Blocks()
 * - Encrypt() and Decrypt() / Alias for Cipher+Pack() and Unpack+Decipher()
 */

var fs = require('fs');
var crypto = require('crypto');
var uuid = require('node-uuid');
var config = require('yaml-config').readConfig('./config/crypto.yml');

const INTEGER_LEN = 4;

function Crypto(logger) {
   this.log = logger.child({ lib: 'Crypto' });

   self = this;
}

Crypto.UUID = function() {
   return uuid.v4();
}

Crypto.GenerateIV = function(iv_size, callback) {
   crypto.randomBytes(iv_size, function(err, iv) {
      if (err) {
         self.log.error(err);
         return callback(err);
      }

      callback(null, iv);
   });
}

Crypto.Blocks = function(buffer, size) {
   var len = buffer.length;
   var rounds = Math.ceil(len / size);

   var blocks = [];
   for (var i = 1; i <= rounds; i++) {
      var block = new Buffer(size);
      var start = (i - 1) * size;

      buffer.copy(block, 0, start, start+size);
      blocks.push(block);
   }

   return blocks;
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

Crypto.Cipher = function(plaintext, secret_key, salt, iv, callback) {
   crypto.pbkdf2(secret_key, salt, config.iterations, config.keylen, function(err, key) {
      if (err) {
         self.log.error(err);
         return callback(err);
      }

      var cipher = crypto.createCipheriv(config.algorithm, key, iv);
      cipher.setAutoPadding(config.autopadding);

      var ciphertext = cipher.update(plaintext, 'utf8', config.format);
      ciphertext += cipher.final(config.format);

      callback(null, ciphertext);
   });
}

Crypto.Decipher = function(ciphertext, secret_key, salt, iv, callback) {
   crypto.pbkdf2(secret_key, salt, config.iterations, config.keylen, function(err, key) {
      if (err) {
         self.log.error(err);
         return callback(err);
      }

      var decipher = crypto.createDecipheriv(config.algorithm, key, iv);
      decipher.setAutoPadding(config.autopadding);

      var plaintext = decipher.update(ciphertext, config.format, 'utf8');
      plaintext += decipher.final('utf8');

      if (callback !== undefined) {
         callback(null, plaintext);
      }

      return plaintext;
   });
}

/*
 * @param object unpackedObj = { int iv_size, string iv, string ciphertext } (implements config.format)
 * @return encoded buffer packedBuffer (implements config.format)
 */
Crypto.Pack = function(unpackedObj) {
   if (typeof unpackedObj !== 'object') {
      return null;
   }

   /*
    * @param object unpackedObj
    * @requires buffer iv_size (presently enforces config.iv_size)
    * @requires buffer iv
    * @requires buffer ciphertext
    */
   if (unpackedObj.iv_size === undefined || unpackedObj.iv_size !== config.iv_size) {
      self.log.error('Crypto.Pack() expects iv_size property to be ' + config.iv_size);
      return null;
   }

   if (unpackedObj.iv === undefined) {
      self.log.error('Crypto.Pack() expects iv property');
      return null;
   }

   if (unpackedObj.ciphertext === undefined) {
      self.log.error('Crypto.Pack() expects ciphertext property');
      return null;
   }

   // Pack iv_size buffer using BIG_ENDIAN
   var n_buffer = new Buffer(INTEGER_LEN);
   n_buffer.writeUInt32BE(unpackedObj.iv_size, 0);

   // Pack iv buffer
   var i_buffer = new Buffer(unpackedObj.iv, config.format);

   // Pack ciphertext buffer
   var c_buffer = new Buffer(unpackedObj.ciphertext, config.format);

   var packedBuffer = new Buffer(n_buffer.length + i_buffer.length + c_buffer.length);
   n_buffer.copy(packedBuffer, 0, 0, n_buffer.length);
   i_buffer.copy(packedBuffer, n_buffer.length, 0, i_buffer.length);
   c_buffer.copy(packedBuffer, n_buffer.length + i_buffer.length, 0, c_buffer.length);

   return packedBuffer.toString(config.format);
}

/*
 * @param buffer packedBuffer [ iv_size + iv + ciphertext ]
 * @return object unpackedObj = { iv_size: buffer, iv: buffer, ciphertext: buffer } (implements config.format)
 */
Crypto.Unpack = function(packedBuffer) {

   if (!Buffer.isBuffer(packedBuffer)) {
      self.log.error('Crypto.Unpack() expects buffer argument');
      return null;
   }

   var unpackedObj = {};

   // Unpack iv_size using BIG_ENDIAN
   var n_buffer = new Buffer(INTEGER_LEN);
   packedBuffer.copy(n_buffer, 0, 0, INTEGER_LEN);
   unpackedObj.iv_size = n_buffer.readUInt32BE(0);

   // Unpack iv
   var i_buffer = new Buffer(unpackedObj.iv_size);
   packedBuffer.copy(i_buffer, 0, INTEGER_LEN, (INTEGER_LEN + unpackedObj.iv_size));
   unpackedObj.iv = i_buffer.toString(config.format);

   // Unpack ciphertext
   var c_buffer = new Buffer(packedBuffer.length - (INTEGER_LEN + unpackedObj.iv_size));
   packedBuffer.copy(c_buffer, 0, (INTEGER_LEN + unpackedObj.iv_size), packedBuffer.length);
   unpackedObj.ciphertext = c_buffer.toString(config.format);

   return unpackedObj;
}

/*
 * Crypt.Encrypt()
 * - Generates cryptographically strong psuedo-random initialization vector (IV)
 * - Use password based key encryption
 * - Amend ciphertext with size and value of IV
 */
Crypto.Encrypt = function(data, callback) {
   if (data === null) {
      return callback(null, null);
   }

   Crypto.GenerateIV(config.iv_size, function(err, iv) {
      if (err) {
         self.log.error(err);
         return callback(err);
      }

      Crypto.Cipher(data, config.secret_key, config.salt, iv, function(err, ciphertext) {
         if (err) {
            self.log.error(err);
            return callback(err);
         }

         callback(null, Crypto.Pack({
            iv_size: config.iv_size,
            iv: iv.toString(config.format),
            ciphertext: ciphertext.toString(config.format)
         }));
      });
   });
}

/*
 * Crypt.Decrypt()
 * @param buffer packedBuffer - must be properly packed using Crypto.Pack()
 */
Crypto.Decrypt = function(packedBuffer, callback) {
   var unpackedObj = Crypto.Unpack(new Buffer(packedBuffer, config.format));
   var iv_size = unpackedObj.iv_size;
   var iv = new Buffer(unpackedObj.iv, config.format);
   var ciphertext = new Buffer(unpackedObj.ciphertext, config.format);

   Crypto.Decipher(ciphertext, config.secret_key, config.salt, iv, function(err, plaintext) {
      if (err) {
         self.log.error(err);
         return callback(err);
      }

      callback(null, plaintext);
   });
}

module.exports = Crypto;
