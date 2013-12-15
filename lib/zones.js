var log = require('./logger');

function Zone() {

}

function Instance(zone) {

}

function ZoneManager(app) {
  this.app = app;
  this.zones = {};
  this.instances = {};
}

module.exports = ZoneManager;
