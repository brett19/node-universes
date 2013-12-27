var bunyan = require('bunyan');

//var logger = bunyan.createLogger({ name: 'node-mmo' });

function _pad(val) {
  if (val < 10) {
    return '0' + val;
  } else {
    return '' + val;
  }
}
function _now() {
  var dt = new Date();
  return _pad(dt.getHours()) + ':' +
      _pad(dt.getMinutes()) + ':' + _pad(dt.getSeconds());
}

var fakeLogger = {};
fakeLogger.write = function(level, _args) {
  var args = ['['+process.pid + ' ' + _now() + '] ' + level + ':'];
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
