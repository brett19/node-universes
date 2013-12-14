# node-mmo
> Concept MMO project written in node.js

## Targets
* Couchbase
* Autonomous clustering across servers with distributed system handling.
* Player zoning and load balancing.
* REST API for stats, registration, etc...
* Socket based communication channels with clients for real-time events.
* Authentication.
* Cryptography helper.
* Multiple samples (RPG, ChatRooms, REST-Only [like node-gameapi])
* Per-user "mailbox" support.
* Seamless data storage/retrieval helper.

## Zoning Methodologies
* Rooms - Splitting users based on the room they have joined.
* Zones - Splitting users based on what zone they are in, additionally, players
  only receive information for players that are nearby.
* World - Splitting users based on automatically distributed regions of one
  massive world.  Players still only receive event notifications that are
  specific to them.

