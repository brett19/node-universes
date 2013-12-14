var bunyan = require('bunyan');

//var logger = bunyan.createLogger({ name: 'node-mmo' });

var fakeLogger = {};
fakeLogger.write = function(level, _args) {
  var args = ['['+process.pid+'] ' + level + ': '];
  for (var i = 0; i < _args.length; ++i) {
    args.push(_args[i]);
  }
  console.log.apply(this, args);
};
fakeLogger.fatal = function() {
  this.write('FATAL', arguments)
};
fakeLogger.error = function() {
  this.write('ERROR', arguments)
};
fakeLogger.warn = function() {
  this.write('WARN', arguments)
};
fakeLogger.info = function() {
  this.write('INFO', arguments)
};
fakeLogger.debug = function() {
  this.write('DEBUG', arguments)
};
fakeLogger.trace = function() {
  this.write('TRACE', arguments)
};

module.exports = fakeLogger;
