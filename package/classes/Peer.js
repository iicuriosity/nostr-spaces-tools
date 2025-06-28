export class Peer {
  constructor(
    space,
    name,
    publicKey,
    isHost,
    isCoHost,
    isSpeaker,
    networkMetrics,
    requestConnectionToPeer,
    sendIceCandidateToRemotePeer,
    sendSdpAnswerToRemotePeer,
    sendOfferToRemotePeer,
    onAudioClientConnection = () => {},
    onAudioClientConnectionClosing = () => {},
    iceServers = [
      {
        urls: 'stun:stun.l.google.com:19302',
      },
    ]
  ) {
    this.requestConnectionToPeer = requestConnectionToPeer;
    this.space = space;
    this.name = name;
    this.publicKey = publicKey;
    this.isHost = isHost;
    this.isCoHost = isCoHost;
    this.isSpeaker = isSpeaker;
    this.sendIceCandidateToRemotePeer = sendIceCandidateToRemotePeer;
    this.sendSdpAnswerToRemotePeer = sendSdpAnswerToRemotePeer;
    this.sendOfferToRemotePeer = sendOfferToRemotePeer;
    this.iceServers = iceServers;
    this.networkMetrics = networkMetrics;
    this.onAudioClientConnection = onAudioClientConnection;
    this.onAudioClientConnectionClosing = onAudioClientConnectionClosing;
    this.clientPeer = false;
    this.subscriptionClosers = [];
  }

  reserveConnection() {
    this.requestConnectionToPeer(this);
  }

  initConnection() {
    const configuration = {
      iceServers: this.iceServers /*[
        {
          urls: 'stun:stun.l.google.com:19302',
        },
      ],*/,
    };
    this.peerConnection = new RTCPeerConnection(configuration);
    this.peerConnection.onicecandidate = event => {
      if (event.candidate) {
        // Send the ICE candidate to the remote peer through the signaling server
        this.sendIceCandidateToRemotePeer(this, event.candidate);
      }
    };
    this.lastPeerConnectionState = 'new'; // Initialize with the default state
    if (this.isSpeaker || this.isHost || this.isCoHost)
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then(stream => {
          this.localStream = stream; // Set the stream directly to the localStream state
          stream
            .getTracks()
            .forEach(track => this.peerConnection.addTrack(track, stream));
        })
        .catch(error => console.error('Error accessing media devices.', error));

    if (this.space.audioProviderNode(this))
      this.registerRemoteAudioStreamOutput();

    this.peerConnection.addEventListener('connectionstatechange', () => {
      if (
        this.lastPeerConnectionState === 'new' &&
        this.peerConnection.connectionState === 'connecting' &&
        this.clientPeer
      ) {
        this.onAudioClientConnection();
        //else if (this.peerConnection.connectionState === 'connected') {
        // Peer is connected, access local media streams
      } else if (
        ['connected', 'disconnected', 'failed'].includes(
          this.lastPeerConnectionState
        ) &&
        this.peerConnection.connectionState === 'closed' &&
        this.clientPeer
      )
        this.onAudioClientConnectionClosing();
      this.lastPeerConnectionState = this.peerConnection.connectionState;
    });
  }

  onRemotePeerIceCandidateReceived(iceCandidates) {
    iceCandidates.forEach(candidate => {
      // Add each ICE candidate to the peer connection
      this.peerConnection.addIceCandidate(candidate);
    });
  }

  registerRemoteAudioStreamOutput() {
    // Listen for remote stream
    this.peerConnection.ontrack = event => {
      //if (this.isCoHost || this.isHost || this.isSpeaker) return;
      const [remoteStream] = event.streams;
      this.space.addRemoteAudio(remoteStream, this.publicKey);
      this.space.broadcastTrack(this, event, remoteStream);
    };
  }

  closeRemoteAudioStreamOutput() {
    this.space.dropRemoteAudio(this.publicKey);
  }

  transmitTrack(peer, event, remoteStream) {
    this.peerConnection.addTrack(event.track, remoteStream);
  }

  toggleMute() {
    if (this.localStream)
      this.localStream
        .getAudioTracks()
        .forEach(track => (track.enabled = !track.enabled));
  }

  stopMediaTracks() {
    if (this.localStream)
      this.localStream.getTracks().forEach(track => track.stop());
  }

  async handleAnswer(answer) {
    this.clientPeer = false;
    // Set the remote peer's SDP answer as the remote description
    const answerDesc = new RTCSessionDescription({
      type: 'answer',
      sdp: answer,
    });
    await this.peerConnection.setRemoteDescription(answerDesc);
  }

  async acceptOffer(offer) {
    this.clientPeer = true;
    // Set the remote peer's SDP offer as the remote description
    const offerDesc = new RTCSessionDescription({ type: 'offer', sdp: offer });
    await this.peerConnection.setRemoteDescription(offerDesc);
    // Create an SDP answer
    const answer = await this.peerConnection.createAnswer();
    // Set the local peer's SDP answer as the local description
    await this.peerConnection.setLocalDescription(answer);
    // Send the SDP answer to the remote peer through the signaling server
    this.sendSdpAnswerToRemotePeer(this, answer.sdp);
  }

  async createOffer() {
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      // Send the offer to the remote peer through the signaling server
      this.sendOfferToRemotePeer(this, offer.sdp);
    } catch (error) {
      console.error('Error creating and sending offer:', error);
    }
  }

  getPeerConnectionState() {
    return this.peerConnection.connectionState;
  }

  closeChannel() {
    this.closeSubscriptions();
    this.stopMediaTracks();
    this.closeRemoteAudioStreamOutput();
    if (this.peerConnection) this.peerConnection.close();
    this.peerConnection = null;
  }

  isConnected() {
    return this.peerConnection.connectionState === 'connected';
  }

  getMaxAudioOutput() {
    return this.networkMetrics.maxAudioOutputs;
  }

  getUploadSpeedInKbps() {
    return this.networkMetrics.uploadSpeedKbps;
  }

  addSubscriptionCloser(subscriptionCloser) {
    this.subscriptionClosers.push(subscriptionCloser);
  }

  closeSubscriptions() {
    this.subscriptionClosers.forEach(subCloser => subCloser.close());
    this.subscriptionClosers = [];
  }
}
