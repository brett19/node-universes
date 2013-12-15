var argv = require('optimist').argv;
var log = require('./../../lib/logger');
var MmoApp = require('./../../lib/app');
var MmoPrimus = require('./../../lib/primus');
var MmoRooms = require('./../../lib/rooms');

var options = {
  couchbase: {
    host: 'localhost:8091',
    bucket: 'default',
    password: ''
  }
};

var app = new MmoApp(options);
var ws = new MmoPrimus(app);
var rooms = new MmoRooms(app);

app.static('/logos', './logos');
app.static('/client', __dirname + '/client');

app.non('join', function(client, args) {
  client.name = args.name;
  client.color = args.color;
  client.x = args.x;
  client.y = args.y;

  var room = rooms.findRoom('main');
  if (!room) {
    rooms.createRoom('main', client);
  } else {
    room.addClient(client);
  }

  client.nemit('joined');
});

rooms.on('clientJoined', function(room, client) {
  log.debug('rooms:clientJoined', room.uuid, client.uuid);

  // Send my addplayer to everyone except me
  room.nemit(client, 'addplayer', {
    uuid: client.uuid,
    name: client.name,
    color: client.color,
    x: client.x,
    y: client.y
  });

  for (var i = 0; i < room.clients.length; ++i) {
    var oclient = room.clients[i];

    // Don't update me about myself
    if (oclient === client) {
      continue;
    }

    // Tell this client about another
    client.nemit('addplayer', {
      uuid: oclient.uuid,
      name: oclient.name,
      color: oclient.color,
      x: oclient.x,
      y: oclient.y
    });
  }
});
rooms.on('clientLeft', function(room, client) {
  log.debug('rooms:clientLeft', room.uuid, client.uuid);

  room.nemit('delplayer', {
    uuid: client.uuid
  });
});

rooms.non('moveTo', function(room, client, cmd, args) {
  client.x = args.x;
  client.y = args.y;

  room.nemit(client, 'moveTo', {
    uuid: client.uuid,
    x: client.x,
    y: client.y
  });
});

app.on('ready', function() {
  log.info('Server Ready');
});
app.start();
