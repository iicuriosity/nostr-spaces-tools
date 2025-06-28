import { Peer } from './Peer.js';
import { CollaborationGraph } from './CollaborationGraph.js';
import { nostrChannel } from './NostrChannel.js';

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
    sendOffer,
    addRemoteAudio = (stream, nodePublicKey) => {},
    dropRemoteAudio = nodePublicKey => {}
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
    this.me = me;
    this.coHosts = coHosts || [];
    this.optimumUploadSpeedKbps = optimumUploadSpeedKbps;
    this.optimumDownloadSpeedKbps = optimumDownloadSpeedKbps;
    this.distanceScoreWeight = distanceScoreWeight;
    this.speedScoreWeight = speedScoreWeight;
    this.loadScoreWeight = loadScoreWeight;
    this.collaborationGraph = new CollaborationGraph(
      host,
      me,
      optimumUploadSpeedKbps,
      optimumDownloadSpeedKbps,
      distanceScoreWeight,
      speedScoreWeight,
      loadScoreWeight
    );
    //this.peers = [];
    this.state = 'open';
    this.subscriptionClosers = [];
    this.addRemoteAudio = addRemoteAudio;
    this.dropRemoteAudio = dropRemoteAudio;
    this.speechRequest = [];
  }

  prepareSpace() {
    if (!this.host || !this.me)
      throw new Error('Space host and current user must be defined');
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

  addSpeechRequest(publicKey) {
    this.speechRequest.push(publicKey);
  }

  requestSpeech() {
    nostrChannel.requestSpeech(this);
  }

  joinSpace() {
    const node = this.collaborationGraph.fetchBestFit();
    if (node) {
      node.initConnection();
      node.reserveConnection();
    } else {
      console.warn('No suitable peer found to join the space');
    }
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
    this.collaborationGraph
      .getConnectedNodes()
      .forEach(node => node.toggleMute && node.toggleMute());
  }

  endSpace() {
    this.state = 'closed';
    this.leave();
  }

  leave() {
    this.collaborationGraph.getConnectedNodes().forEach(node => {
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
        cohost => cohost.publicKey === insertedNode.publicKey
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
    const node = this.collaborationGraph.getNode(
      peer.publicKey ? peer.publicKey : peer
    );
    if (!node) return;
    node.closeChannel();
    this.collaborationGraph.removeConnection(node, this.me);
  }

  acceptPeerConnection(peer, type, state) {
    this.addConnection(this.me, peer, type, 'accepted');
    peer.initConnection();
  }

  broadcastTrack(node, event, remoteStream) {
    this.collaborationGraph
      .getBroadCastNodes()
      .forEach(peer => peer.transmitTrack(node, event, remoteStream));
  }

  closeSubscriptions() {
    this.subscriptionClosers.forEach(subCloser => subCloser.close());
    this.subscriptionClosers = [];
  }
  audioProviderNode(node) {
    return this.collaborationGraph.audioProviderNode(node);
  }
}
