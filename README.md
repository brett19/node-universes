![Universes](../master/logos/universes.png?raw=true)
> Game Server development framework written in Node.js

## Goals

The primary goal of Universes is to provide a framework for building next generation multiplayer and socially interactive games using Node.js.  To do this, we want to build a solid core through which further modules can be attached on, the following is a list of some of these targets for the core as well as secondary modules:

* Easy data persistence handling using Couchbase.  node-ottoman is a good base for implementing this, but is immature.
* Autonomous clustering of many universe processes acting as a cluster of nodes.
* Built-in REST api for handling debug information, system statistics, administration capabilities and other not-real-time server endpoints.
* Real-time communications with clients through technologies like websockets, raw tcp/udp sockets or other streaming protocols.
* Cryptography helpers built in.

Additionally, here is a list of higher level modules which would be interesting to add.

 * Authentication
 * Cryptography helpers.
 * Player online/offline `mailbox` support.
 * Packaged modules for handling the distribution of connected real-time players accross a number of universe nodes within the cluster.
   * Rooms - Splitting users based on the specific room they have joined.
   * Zones - Splitting users based on what zone (or maps as they are sometimes referred to) they are in, additionally, players
   only receive information for players that are nearby.
   * World - Splitting users based on automatically distributed regions of one
   massive world (open-world).  Players still only receive event notifications that are
   specific to them.

## To-Do

In addition to the specific goals above.  There are a number of low-level to-do items which should be considered and properly implemented.

* Design a sane interface for handling a plugin architecture.  This is complicated by the fact that in a lot of cases, once a plugin has been attached to your Universes app, you still need direct access to that modules instance to perform setup tasks.
* Develop a sane way to handle both rest and real-time networking.  Reconsidering the .get/.post/.put/.del and .nemit/.non methods is probably in order.