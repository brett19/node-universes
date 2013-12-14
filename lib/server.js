var argv = require('optimist').argv;
var db = require('./couchbase').mainBucket;
var log = require('./log');
var EpicCluster = require('./epiccluster');
var MmoApp = require('./app');
var WebSockets = require('./websockets');

var cluster = new EpicCluster(db);
var app = new MmoApp(cluster);
var ws = new WebSockets(app);

/*
var ZoneManager = require('./zones');

var zoneMgr = new ZoneManager(app);

app.cmd('auth', function(client, args) {
  client.authenticated = true;
  client.name = args.name;
  client.color = args.color;
  client.x = args.x;
  client.y = args.y;

  zoneMgr.join('main', client);
});

zoneMgr.on('clientJoined', function(zone, client) {

});

zoneMgr.on('clientLeft', function(zone, client) {

});
*/

app.static('/client', __dirname + '/../public/client');


app.on('ready', function() {
  log.info('Server Ready');
});
app.start();
