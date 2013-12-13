function Zone() {

}

function Instance(zone) {

}

function ZoneManager(app) {
  this.app = app;

}

ZoneManager.prototype.registerZone = function(name, handler) {
  // This register a new zone type which allow instances to be
  //   created.
};

ZoneManager.prototype.createInstance = function(zoneName) {
  // This creates a new instance of a particular zone and returns
  //   the ID of this new zone.  The created zone may not exist on
  //   this node.
};

ZoneManager.prototype.findInstance = function(zoneName) {
  // This should find a Zone with open player slots,
  //   or if a good one doesn't exist, it should
  //   spin a new zone and use that one.
};

modules.exports = function(app) {
  // This should register this module with the owning app.
};
