# Epic Cluster

## Goal

The Universes `epic cluster` core module (perhaps soon renamed to `galaxies`) is a system that enables the management and distributed communication between all Universes nodes that are a part of your application deployment.  Epic Cluster handles the spawning of multiple processes on a single system as well as the networking required to allow all nodes to communicate to eachother.

## How It Currently Works
### Description

The galaxies module uses the existing Node.js cluster module to spawn multiple forks of the already-running process.  When this happens, each individual worker looks up a document within your Couchbase bucket that holds a list of all already-active nodes.  Once it retrieves this list, it will begin connecting to each node within this list and negotiating with them to establish a connection.  At the same time, the node will also add itself to this document which will allow new nodes in the cluster to find this one.  Once a connection is established, galaxies will emit a `nodeJoined` event to notify observers that a new node is connected, this allows them to send any neccessary state information.  If a connection drops, a `nodeLeft` event will be emited as well.

### The Protocol
A `handshake_syn` packet is sent upon successfuly establishing a connection.  This package will contain the expected UUID of the node we are connecting to as well as the UUID of the node that initiated the connection.  Upon receipt of the `handshake_syn` on the other node, it will compare the `target_uuid` with their own uuid to ensure they are the correctly targetted node (its possible the cluster map is out of date and a new cluster-node is now serving on that port), if this is incorrect, it will destroy the connection, if it is correct, it will emit the `nodeJoined` event within this node, and then send back a `handshake_ack` packet to let the initiating node that everything is valid and that it should emit its own `nodeJoined`.


## How It Should Work

A much more efficient and less network-heavy alternative should be implemented whereby, the workers all communicate with the master node and register themselves, and the master node will be in charge of actually performing TCP communications with other node host servers.  This is somewhat complicated by the fact that in the current implementation, the master node does no attempt to maintain the state of cluster.  This may be able to be mitigated by having worker processes `advertise` their cluster-map to the master process to allow it to identify where it should be forwarding packets.  Ideally the protocol will be enhanced with a per-command identifier to allow the 'linking' of a request to a reply, but it will additionally allow the master process to multiplex requests passing over the network from the workers.