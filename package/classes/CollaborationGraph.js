import { Connection } from './Connection.js';
const CONNECTION_TYPE = {
  CONSUMER: 'consumer',
  PRODUCER: 'producer',
};
const CONNECTION_STATE = {
  INITIATED: 'initiated',
  ACCEPTED: 'accepted',
};

const DEFAULT_UPLOAD_SPEED = 500; // Default upload speed
const DEFAULT_DOWNLOAD_SPEED = 320; // Default download speed
export class CollaborationGraph {
  constructor(
    host,
    me,
    optimumUploadSpeedKbps = DEFAULT_UPLOAD_SPEED,
    optimumDownloadSpeedKbps = DEFAULT_DOWNLOAD_SPEED,
    distanceScoreWeight = 0.4,
    speedScoreWeight = 0.4,
    loadScoreWeight = 0.2
  ) {
    this.nodes = new Map(); // Key: publicKey, Value: Node instance
    this.connections = []; // Array of Connection instances
    this.host = host;
    if (host && host.publicKey === me.publicKey) this.me = host;
    else this.me = me;
    if (host) this.nodes.set(this.host.publicKey, this.host);
    this.nodes.set(this.me.publicKey, this.me);
    this.refused = [];
    this.optimumUploadSpeedKbps = optimumUploadSpeedKbps;
    this.optimumDownloadSpeedKbps = optimumDownloadSpeedKbps;
    this.distanceScoreWeight = distanceScoreWeight;
    this.speedScoreWeight = speedScoreWeight;
    this.loadScoreWeight = loadScoreWeight;
  }

  addNode(node) {
    if (!node) return;
    if (this.nodes.has(node.publicKey)) return this.nodes.get(node.publicKey);
    else {
      this.nodes.set(node.publicKey, node);
      if (node.isHost) this.host = node;
      return node;
    }
  }

  getNode(pub) {
    return this.nodes.get(pub);
  }

  getConnectedNodes() {
    return this.connections
      .filter(
        conn =>
          conn.node1.publicKey === this.me.publicKey ||
          conn.node2.publicKey === this.me.publicKey
      )
      .map(conn =>
        conn.node1.publicKey === this.me.publicKey ? conn.node2 : conn.node1
      );
  }

  removeConnection(node1, node2) {
    this.connections = this.connections.filter(
      conn =>
        !(
          (conn.node1.publicKey === node1.publicKey &&
            conn.node2.publicKey === node2.publicKey) ||
          (conn.node1.publicKey === node2.publicKey &&
            conn.node2.publicKey === node1.publicKey)
        )
    );
  }

  removeNode(node) {
    const existing = node ? this.nodes.get(node.publicKey) : undefined;
    if (!existing) return;
    existing.closeChannel();
    existing.closeSubscriptions();
    this.connections = this.connections.filter(
      conn =>
        conn.node1.publicKey !== existing.publicKey &&
        conn.node2.publicKey !== existing.publicKey
    );
    this.nodes.delete(existing.publicKey);
  }

  addConnection(node1, node2, type, state = 'initiated') {
    // Ensure both nodes are in the graph
    node1 = this.addNode(node1);
    node2 = this.addNode(node2);

    // Check if the connection already exists and update it if necessary
    const existingConnection = this.connections.find(
      conn =>
        conn.node1.publicKey === node1.publicKey &&
        conn.node2.publicKey === node2.publicKey
    );

    if (existingConnection) {
      existingConnection.type = type; // Update type if necessary
      existingConnection.state = state; // Update state
    } else {
      // Add new connection

      this.connections.push(new Connection(node1, node2, type, state));
    }
  }

  myConsumerNode(node) {
    return this.connections.some(
      conn =>
        (conn.node1.publicKey === node.publicKey &&
          conn.node2.publicKey === this.me.publicKey &&
          conn.type === CONNECTION_TYPE.CONSUMER) ||
        (conn.node2.publicKey === node.publicKey &&
          conn.node1.publicKey === this.me.publicKey &&
          conn.type === CONNECTION_TYPE.PRODUCER)
    );
  }

  audioProviderNode(node) {
    return this.connections.some(
      conn =>
        node.isSpeaker ||
        node.isCoHost ||
        node.isHost ||
        (conn.node2.publicKey === node.publicKey &&
          conn.node1.publicKey === this.me.publicKey &&
          conn.type === CONNECTION_TYPE.CONSUMER) ||
        (conn.node1.publicKey === node.publicKey &&
          conn.node2.publicKey === this.me.publicKey &&
          conn.type === CONNECTION_TYPE.PRODUCER)
    );
  }

  isNodeConnected(node) {
    return this.connections.some(
      conn =>
        (conn.node1.publicKey === node.publicKey &&
          conn.node2.publicKey === this.me.publicKey) ||
        (conn.node2.publicKey === node.publicKey &&
          conn.node1.publicKey === this.me.publicKey)
    );
  }

  countConsumerNodes(node) {
    return this.connections.filter(
      conn =>
        (conn.node2.publicKey === node.publicKey &&
          conn.type === CONNECTION_TYPE.CONSUMER) ||
        (conn.node1.publicKey === node.publicKey &&
          conn.type === CONNECTION_TYPE.PRODUCER)
    ).length;
  }

  getBroadCastNodes() {
    return this.connections.filter(
      conn =>
        (!(conn.node1.isSpeaker || conn.node1.isHost || conn.node1.isCoHost) &&
          conn.node2.publicKey === this.me.publicKey &&
          conn.type === CONNECTION_TYPE.CONSUMER) ||
        (!(conn.node2.isSpeaker || conn.node2.isHost || conn.node2.isCoHost) &&
          conn.node1.publicKey === this.me.publicKey &&
          conn.type === CONNECTION_TYPE.PRODUCER)
    );
  }

  fetchBestFit() {
    let bestScore = -Infinity;
    let bestNode = null;

    for (const node of this.nodes.values()) {
      if (
        node.publicKey === this.me.publicKey ||
        this.countConsumerNodes(node) >= node.getMaxAudioOutput() ||
        this.myConsumerNode(node) ||
        this.refused.some(r => r.publicKey === node.publicKey)
      ) {
        continue;
      }
      const score = this.calculateNodeScore(node);
      if (score > bestScore) {
        bestScore = score;
        bestNode = node;
      }
    }
    return bestNode;
  }

  calculateNodeScore(node) {
    const proximityScore = this.calculateProximityScore(node);
    const networkScore = this.calculateNetworkScore(node);
    const loadScore = this.calculateLoadScore(node);
    return (this.me.isSpeaker || this.me.isCoHost || this.me.isHost) &&
      (node.isSpeaker || node.isCoHost || node.isHost)
      ? 1
      :
          proximityScore * this.distanceScoreWeight +
          networkScore * this.speedScoreWeight +
          loadScore * this.loadScoreWeight;
  }

  calculateProximityScore(node) {
    const depth = this.calculateDepth();
    const distance = this.calculateDistance(node);
    return (depth - distance) / depth;
  }

  calculateNetworkScore(node) {
    return this.calculateOutputSpeed(node) / this.optimumUploadSpeedKbps;
  }

  calculateOutputSpeed(node) {
    const visited = new Set();
    const stack = [[node, this.calculateNodeSpeed(node)]]; // Pair of [node, distance]

    while (stack.length > 0) {
      const [currentNode, outputSpeed] = stack.pop();

      if (currentNode.isHost) {
        return outputSpeed; // Found a speaker, return the distance
      }

      visited.add(currentNode.publicKey);
      // Get connected nodes where the current node is a consumer or producer
      this.connections.forEach(conn => {
        if (
          !visited.has(conn.node2.publicKey) &&
          conn.node1.publicKey === currentNode.publicKey &&
          conn.type === CONNECTION_TYPE.CONSUMER
        ) {
          stack.push([
            conn.node2,
            Math.min(outputSpeed, this.calculateNodeSpeed(conn.node2)),
          ]);
        } else if (
          !visited.has(conn.node1.publicKey) &&
          conn.node2.publicKey === currentNode.publicKey &&
          conn.type === CONNECTION_TYPE.PRODUCER
        ) {
          stack.push([
            conn.node1,
            Math.min(outputSpeed, this.calculateNodeSpeed(conn.node1)),
          ]);
        }
      });
    }
    return -Infinity;
  }

  calculateNodeSpeed(node) {
    return Math.min(
      node.getUploadSpeedInKbps() / node.getMaxAudioOutput(),
      this.optimumUploadSpeedKbps
    );
  }

  calculateLoadScore(node) {
    return (
      (node.getMaxAudioOutput() - this.countConsumerNodes(node)) /
      node.getMaxAudioOutput()
    );
  }

  closeConnection(node1, node2) {
    this.connections = this.connections.filter(
      conn =>
        !(
          (conn.node1.publicKey === node1.publicKey &&
            conn.node2.publicKey === node2.publicKey) ||
          (conn.node1.publicKey === node2.publicKey &&
            conn.node2.publicKey === node1.publicKey)
        )
    );
  }

  saveConnectionRefusal(node) {
    if (!this.refused.some(elt => elt.publicKey === node.publicKey))
      this.refused.push(node);
  }

  calculateDepth() {
    const visited = new Set();
    let maxDepth = 0;
    const dfs = (node, depth) => {
      visited.add(node.publicKey);
      maxDepth = Math.max(maxDepth, depth);

      this.connections.forEach(conn => {
        if (
          !visited.has(conn.node2.publicKey) &&
          conn.node1.publicKey === node.publicKey &&
          conn.type === CONNECTION_TYPE.PRODUCER
        ) {
          dfs(conn.node2, depth + 1);
        } else if (
          !visited.has(conn.node1.publicKey) &&
          conn.node2.publicKey === node.publicKey &&
          conn.type === CONNECTION_TYPE.CONSUMER
        ) {
          dfs(conn.node1, depth + 1);
        }
      });
    };
    const hostNode = this.nodes.get(this.host.publicKey);
    if (hostNode) {
      dfs(hostNode, 0);
    }
    return maxDepth;
  }

  calculateDistance(node1) {
    const visited = new Set();
    const stack = [[node1, 0]]; // Pair of [node, distance]

    while (stack.length > 0) {
      const [currentNode, distance] = stack.pop();

      if (currentNode.isHost) {
        return distance; // Found a speaker, return the distance
      }

      visited.add(currentNode.publicKey);
      // Get connected nodes where the current node is a consumer or producer
      this.connections.forEach(conn => {
        if (
          !visited.has(conn.node2.publicKey) &&
          conn.node1.publicKey === currentNode.publicKey &&
          conn.type === CONNECTION_TYPE.CONSUMER
        ) {
          stack.push([conn.node2, distance + 1]);
        } else if (
          !visited.has(conn.node1.publicKey) &&
          conn.node2.publicKey === currentNode.publicKey &&
          conn.type === CONNECTION_TYPE.PRODUCER
        ) {
          stack.push([conn.node1, distance + 1]);
        }
      });
    }
    return -Infinity;
  }

  viableNodeConnection(node) {
    if (this.countConsumerNodes(this.me) < this.me.getMaxAudioOutput())
      return [true];
    const nodeScore = this.calculateNodeScore(node);
    const [worstNode, worstScore] = this.getWorstChild();
    if (worstScore >= nodeScore) return [false];
    else return [true, worstNode];
  }

  getWorstChild() {
    const childNodes = this.connections
      .filter(
        conn =>
          (conn.node2.publicKey === this.me.publicKey &&
            conn.type === CONNECTION_TYPE.CONSUMER &&
            !conn.node1.isHost &&
            !conn.node1.isCoHost &&
            !conn.node1.isSpeaker) ||
          (conn.node1.publicKey === this.me.publicKey &&
            conn.type === CONNECTION_TYPE.PRODUCER &&
            !conn.node2.isHost &&
            !conn.node2.isCoHost &&
            !conn.node2.isSpeaker)
      )
      .map(conn =>
        conn.node2.publicKey === this.me.publicKey ? conn.node1 : conn.node2
      );

    let worstScore = Infinity;
    let worstNode = null;
    for (const node of childNodes) {
      const score = this.calculateNodeScore(node);
      if (score < worstScore) {
        worstScore = score;
        worstNode = node;
      }
    }
    return [worstNode, worstScore];
  }
}
