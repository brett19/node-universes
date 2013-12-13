function Zone() {

}

function Instance(zone) {

}
/*
  Instance Map:
    {
      load: 0.1,
      zones: ['map1', 'map2', 'cave'],
      instances: {
        '<uuid>': { zone: 'map1' }
      }
    }
 */

function ZoneManager(app) {
  this.app = app;
  this.zones = {};
  this.instmap = {};

  var self = this;
  app.cluster.msg('instmap', function(client, map) {
    self.instmap[client.uuid] = map;
  });
  app.cluster.on('nodeLeft', function(uuid) {
    delete self.instmap[uuid];
  });

  app.on('start', function() {
    console.log('Zones Starting');

    self._emitInstMap();

    // Every 30 seconds, emit an updated instmap to everyone
    setInterval(function() {
      self._emitInstMap();
    }, 30000);
  });

}

ZoneManager.prototype._emitInstMap = function() {
  var zoneList = [];
  for (var i in this.zones) {
    if (this.zones.hasOwnProperty(i)) {
      zoneList.push(i);
    }
  }

  this.app.cluster.send('instmap', {
    load: 0.1,
    zones: zoneList,
    instances: this.instmap
  });
};

ZoneManager.prototype.registerZone = function(name, handler) {
  // This register a new zone type which allow instances to be
  //   created.
  this.zones[name] = handler;
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

module.exports = function(app) {
  // This should register this module with the owning app.
  return new ZoneManager(app);
};
