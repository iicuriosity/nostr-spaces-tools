import { Peer } from "./Peer.js";
import { CollaborationGraph } from "./CollaborationGraph.js";
export class Space {
  constructor(
    id,
    name,
    host,
    me,
    coHosts,
    optimumUploadSpeedKbps,
    optimumDownloadSpeedKbps,
    distanceScoreWeight,
    speedScoreWeight,
    loadScoreWeight,
    onAudioClientConnection,
    onAudioClientConnectionClosing,
    iceServers,
    onNewPeer,
    requestConnectionToPeer,
    sendIceCandidateToRemotePeer,
    sendAnswer,
    sendOffer
  ) {
    this.requestConnectionToPeer = requestConnectionToPeer;
    this.sendIceCandidateToRemotePeer = sendIceCandidateToRemotePeer;
    this.onAudioClientConnection = onAudioClientConnection;
    this.onAudioClientConnectionClosing = onAudioClientConnectionClosing;
    this.sendAnswer = sendAnswer;
    this.sendOffer = sendOffer;
    this.iceServers = iceServers;
    this.onNewPeer = onNewPeer;
    this.id = id;
    this.name = name;
    this.host = host;
    this.me;
    this.coHosts = coHosts;
    this.imCoHosting = imCoHosting;
    this.optimumUploadSpeedKbps = optimumUploadSpeedKbps;
    this.optimumDownloadSpeedKbps = optimumDownloadSpeedKbps;
    this.distanceScoreWeight = distanceScoreWeight;
    this.speedScoreWeight = speedScoreWeight;
    this.loadScoreWeight = loadScoreWeight;
    /*this.collaborationGraph = new CollaborationGraph(
      host,
      me,
      optimumUploadSpeedKbps,
      optimumDownloadSpeedKbps,
      distanceScoreWeight,
      speedScoreWeight,
      loadScoreWeight
    );*/
    //this.peers = [];
    this.state = "open";
    this.subscriptionClosers = [];
  }

  prepareSpace() {
    // TODO raise exception if host or me are empty
    this.collaborationGraph = new CollaborationGraph(
      this.host,
      this.me,
      this.optimumUploadSpeedKbps,
      this.optimumDownloadSpeedKbps,
      this.distanceScoreWeight,
      this.speedScoreWeight,
      this.loadScoreWeight
    );
  }

  joinSpace() {
    const node = this.collaborationGraph.fetchBestFit();
    if (node) {
      node.initConnection();
      node.reserveConnection();
    }
    // TODO: handle the case where there is no bestFit
  }

  hasPeer(peer) {
    return this.collaborationGraph.nodes.has(peer.publicKey);
  }

  addPeer(peer) {
    this.collaborationGraph.addNode(peer);
  }

  removePeer(peer) {
    this.collaborationGraph.removeNode(peer);
  }

  toggleMuteSpace() {
    this.collaborationGraph.getConnectedNodes().muteNodes();
  }

  endSpace() {
    this.state = "closed";
    this.leave();
  }

  leave() {
    this.collaborationGraph.getConnectedNodes().forEach((node) => {
      node.closeChannel();
      node.closeSubscriptions();
    });
    this.closeSubscriptions();
  }

  //addNode(node)
  addNode(name, publicKey, isHost, isCoHost, isSpeaker, networkMetrics) {
    const node = new Peer(
      this,
      name,
      publicKey,
      isHost,
      isCoHost,
      isSpeaker,
      networkMetrics,
      this.requestConnectionToPeer,
      this.sendIceCandidateToRemotePeer,
      this.sendAnswer,
      this.sendOffer,
      this.onAudioClientConnection,
      this.onAudioClientConnectionClosing,
      this.iceServers
    );
    const insertedNode = this.collaborationGraph.addNode(node);
    if (insertedNode.isHost) this.host = insertedNode;
    if (
      insertedNode.isCoHost &&
      !this.coHosts.includes(
        (cohost) => cohost.publicKey === insertedNode.publicKey
      )
    )
      this.coHosts.push(insertedNode);
    this.onNewPeer(insertedNode);
    return insertedNode;
  }
  addConnection(node1, node2, type, state) {
    this.collaborationGraph.addConnection(node1, node2, type, state);
  }
  removeConnection(node1, node2) {
    this.collaborationGraph.removeConnection(node1, node2);
  }

  addSubscriptionCloser(subscriptionCloser) {
    this.subscriptionClosers.push(subscriptionCloser);
  }

  disconnectPeer(peer) {
    peer = this.collaborationGraph.getNode(peer);
    peer.closeChannel();
    this.collaborationGraph.removeConnection(peer, me);
  }

  acceptPeerConnection(peer, type, state) {
    this.addConnection(node1, node2, type, "accepted");
    peer.initConnection();
  }

  closeSubscriptions() {
    this.subscriptionClosers.forEach((subCloser) => subCloser.close());
    this.subscriptionClosers = [];
  }
}
