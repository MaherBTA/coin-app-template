---
to: <%= name %>/config.json
---
{
  "server": {
    "p2p": {
      "minNodesToAllowTxs": 1
    },
    "sharding": {
      "nodesPerConsensusGroup": 60
    }
  }
}