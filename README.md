# node-mmo
> Concept MMO project written in node.js

## Targets
* Couchbase
* Autonomous clustering across multiple servers with distributed system handling
* Player zoning and load balancing
* REST API for stats, registration, etc
* Socket client authentication

## Zoning Methodologies
* Open-world - Segmentation and distribution of zones as server node enters the cluster
* Visible boundaries - Distribution of client connections between available server instances