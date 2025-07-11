/**
 * NostrChannel is a singleton class that handles the communication
 */
import { Peer } from './Peer.js';
import { Space } from './Space.js';
import { extractNetworkMetrics } from '../utility/NetworkMetricsExtractor.js';
import {
  SimplePool,
  Event,
  generateSecretKey,
  getPublicKey,
  finalizeEvent,
} from 'nostr-tools';

const TAGS = {
  SPACE: 's',
  CREATOR: 'h',
  PEER: 'p',
  RTC_APP: 'webrtc',
  D: 'd',
};

const SPACES_APP = 'spaces';

const EVENT_KINDS = {
  CREATE_SPACE: 1000, // This event is triggered by a Host when they create a new space
  JOIN_SPACE: 31101, // This event is triggered by the peer when they join a space
  LEAVE_SPACE: 31102, // This event is triggered by a peer when they leave a space
  CLOSE_SPACE: 1001, // This event is triggered by the host when they close the space
  RESERVE_CONNECTION: 31103, // This event is triggered by a peer when there is a connection attempt between them and another peer.
  CONFIRM_CONNECTION: 31104, //This event is triggered by a peer after receiving a RESERVE_CONNECTION request from another peer and accepting the request
  SDP_OFFER: 21102, // This event is triggered by a peer to exchange the webrtc sdp data, not to be stored by the relays
  SDP_ANSWER: 21103, // This event is triggered by a peer as a response to the SDP_OFFER, not to be stored by the relays
  ICE_CANDIDATE: 21104, // This event is triggered when an ICE candidate is sent to a peer, not to be stored by the relays
  DROP_CONNECTION: 31105, // This event is triggered when a peer drops connection to another peer
  //MUTE_PEER: 31105, // This event is triggered by a host or co-host to mute a peer
  //UNMUTE_PEER: 31106, // This event is triggered by a host or co-host to mute a peer
  REMOVE_PEER: 31106, // This event is triggered when a peer is removed from the space by a host or co-host
  PROMOTE_SPEAKER: 31107, // This event is either sent by the Host/co-host to promote a peer to speaker
  PROMOTE_COHOST: 31108, // This event is either sent by the Host/co-host to promote a peer to co-host
  DEMOTE_TO_PEER: 31109, // This event is either sent by the Host/co-host to demote a speaker to peer or a speaker to demote themselve to peer
  REQUEST_SPEECH: 21105, // This event is sent by a peer that wishes to speak, not to be stored by the relays
  PROPOSE_SPEECH: 21105, // This event is either sent by the Host/co-host, not to be stored by the relays
};
class NostrChannel {
  static instance;
  constructor() {
    if (!NostrChannel.instance) NostrChannel.instance = this;

    return NostrChannel.instance;
  }

  openChannel(relays, profile) {
    this.relays = relays;
    this.profile = profile;
    this.pool = new SimplePool();
    this.subscriptionClosers = [];
  }

  isOpen() {
    return this.relays && this.profile;
  }

  _verifyChannelSetup() {
    if (!this.isOpen())
      throw new Error(
        "Access to this functionality isn't available until the user is connected."
      );
  }

  async _sendEvent(e) {
    this._verifyChannelSetup();
    const signedEvent = finalizeEvent(e, this.profile.privateKey);
    return this.pool.publish(this.relays, signedEvent);
  }

  async _subscribe({ filters, onevent }) {
    this._verifyChannelSetup();
    return this.pool.subscribeMany(this.relays, filters, { onevent });
  }

  async _queryEvents({ filters: [{}] }) {
    this._verifyChannelSetup();
    return this.pool.querySync(this.relays, filters);
  }

  /** sendOffer constructs an offer event and broadcasts it to the nostr relay
   * sendOffer can be used inside the constructor parameter sendOfferToRemotePeer for peers
   *
   * @param {RTCSessionDescriptionInit} offer the sdp offer from the peer's peer connection
   * @param {Peer} peer the space peer to which the offer should be sent
   */
  async sendOffer(peer, offer) {
    //this._verifyChannelSetup();
    const event = {
      pubkey: this.profile.publicKey,
      content: JSON.stringify({
        sdp: offer, // todo encrypt the offer using the peer's public key
      }),
      kind: EVENT_KINDS.SDP_OFFER, // Adjust based on your defined kinds for offers
      tags: [
        [TAGS.PEER, peer.publicKey],
        [TAGS.SPACE, peer.space.id],
        [TAGS.CREATOR, peer.space.host.publicKey],
        [TAGS.RTC_APP, SPACES_APP],
      ], // Tag to direct the message to a specific peer
    };

    await this._sendEvent(event);
  }

  /** sendAnswer constructs an answer event and broadcasts it to the nostr relay
   * sendAnswer can be used inside the constructor parameter sendSdpAnswerToRemotePeer for peers
   *
   * @param {RTCSessionDescriptionInit} answer the sdp answer to the peer's offer
   * @param {Peer} peer the space peer to which the offer should be sent
   */
  async sendAnswer(peer, answer) {
    //this._verifyChannelSetup();
    const event = {
      pubkey: this.profile.publicKey,
      content: JSON.stringify({
        sdp: answer, // todo encrypt the answer using the peer's public key
      }),
      kind: EVENT_KINDS.SDP_ANSWER, // Adjust based on your defined kinds for answers
      tags: [
        [TAGS.PEER, peer.publicKey],
        [TAGS.SPACE, peer.space.id],
        [TAGS.CREATOR, peer.space.host.publicKey],
        [TAGS.RTC_APP, SPACES_APP],
      ], // Tag to direct the message to a specific peer
    };
    await this._sendEvent(event);
  }

  /** sendIceCandidateToRemotePeer constructs an an ice-candidate event and broadcasts it to the nostr-relay
   * sendIceCandidateToRemotePeer can be used inside the constructor parameter sendIceCandidateToRemotePeer for peers
   *
   * @param {RTCSessionDescriptionInit} answer the sdp answer to the peer's offer
   * @param {Peer} peer the space peer to which the offer should be sent
   */
  async sendIceCandidateToRemotePeer(peer, candidate) {
    //this._verifyChannelSetup();
    const event = {
      pubkey: this.profile.publicKey,
      content: JSON.stringify({
        ice: candidate,
      }),
      kind: EVENT_KINDS.ICE_CANDIDATE, // Adjust based on your defined kinds for answers
      tags: [
        [TAGS.PEER, peer.publicKey],
        [TAGS.SPACE, peer.space.id],
        [TAGS.CREATOR, peer.space.host.publicKey],
        [TAGS.RTC_APP, SPACES_APP],
      ], // Tag to direct the message to a specific peer
    };

    await this._sendEvent(event);
  }

  /** subscribeSpacesListEvents allows users to subscribe to Space creation events
   *
   *
   */
  subscribeNewSpaceEvents(
    iceServers,
    onNewSpace,
    onAudioClientConnection,
    onAudioClientConnectionClosing,
    onNewPeer
  ) {
    //this._verifyChannelSetup();
    this.subscriptionClosers.push(
      this._subscribe({
        onevent: event => {
          const { id, name, host, coHosts } = JSON.parse(event.content);
          if (event.pubkey !== host.publicKey) return;
          const space = new Space(
            id,
            name,
            null,
            this.profile,
            [],
            null,
            null,
            null,
            null,
            null,
            onAudioClientConnection,
            onAudioClientConnectionClosing,
            iceServers,
            onNewPeer,
            this.reserveConnection.bind(this),
            this.sendIceCandidateToRemotePeer.bind(this),
            this.sendAnswer.bind(this),
            this.sendOffer.bind(this)
          );
          space.addNode(
            host.name,
            host.publicKey,
            true,
            false,
            false,
            host.networkMetrics
          );
          onNewSpace(space);
        },
        filters: [
          {
            kinds: [EVENT_KINDS.CREATE_SPACE],
            tags: [[TAGS.RTC_APP, SPACES_APP]],
          },
        ],
      })
    );
  }

  /** Fetch ActiveSpaces allows users to query the list of active spaces from relays
   * @returns
   *
   */
  async fetchActiveSpaces(
    filter = {},
    onAudioClientConnection,
    onAudioClientConnectionClosing,
    iceServers,
    onNewPeer
  ) {
    const twoHoursAgo = Math.floor(Date.now() / 1000) - 7200; // 2 hours in seconds
    if (Array.isArray(filter.tags))
      filter.tags = [...filter.tags, [TAGS.RTC_APP, SPACES_APP]];
    else filter.tags = [[TAGS.RTC_APP, SPACES_APP]];
    if (!filter.since) filter.since = twoHoursAgo;
    filter = {
      ...filter,
      ...{
        kinds: [EVENT_KINDS.CREATE_SPACE],
      },
    };

    // Fetch SPACE_CREATION events from the last 2 hours
    const creationEvents = await this._queryEvents({
      filters: [filter],
    });

    const activeSpaces = [];
    for (const event of creationEvents) {
      const createSpaceEvent = JSON.parse(event.content);
      const hostId = event.tags.find(tag => tag[0] === TAGS.CREATOR)?.[1];

      // Check for a CLOSE_SPACE event for each space ID
      const closeEvents = await this._queryEvents({
        filters: [
          {
            authors: [event.pubkey],
            kinds: [EVENT_KINDS.CLOSE_SPACE],
            tags: [
              [TAGS.SPACE, createSpaceEvent.id],
              [TAGS.CREATOR, hostId][(TAGS.RTC_APP, SPACES_APP)],
            ],
          },
        ],
      });
      if (
        closeEvents.length === 0 &&
        createSpaceEvent.host.publicKey !== this.profile.publicKey
      ) {
        const space = new Space(
          id,
          createSpaceEvent.name,
          null,
          this.profile,
          [],
          null,
          null,
          null,
          null,
          null,
          onAudioClientConnection,
          onAudioClientConnectionClosing,
          iceServers,
          onNewPeer,
          this.reserveConnection.bind(this),
          this.sendIceCandidateToRemotePeer.bind(this),
          this.sendAnswer.bind(this),
          this.sendOffer.bind(this)
        );
        space.addNode(
          createSpaceEvent.host.name,
          createSpaceEvent.host.publicKey,
          true,
          false,
          false,
          createSpaceEvent.host.networkMetrics
        );
        activeSpaces.push(space);
      }
    }

    return activeSpaces; // This contains SPACE_CREATION events considered active
  }

  /** subscribeCloseSpaceEvent allows users to subscribe to Space closing events
   *
   *
   */
  subscribeCloseSpaceEvent(space, onClose) {
    //this._verifyChannelSetup();
    space.addSubscriptionCloser(
      this._subscribe({
        onevent: event => {
          space.leave();
          if (onClose) onClose(space);
        },
        filters: [
          {
            authors: [space.host.publicKey],
            kinds: [EVENT_KINDS.CLOSE_SPACE],
            tags: [
              [TAGS.SPACE, space.id],
              [TAGS.CREATOR, space.host.publicKey],
              [TAGS.RTC_APP, SPACES_APP],
            ],
          },
        ],
      })
    );
  }

  /** subscribeNewPeerEvent allows users to subscribe to any new peer event for a specific space.
   *
   *
   */
  subscribeNewPeerEvent(space) {
    //this._verifyChannelSetup();
    space.addSubscriptionCloser(
      this._subscribe({
        onevent: event => {
          const { networkMetrics } = JSON.parse(event.content);
          const peer = space.addNode(
            event.pubkey,
            event.pubkey,
            false,
            false,
            false,
            networkMetrics
          );
          this.subscribeLeaveSpaceEvent(peer);
          //onNewPeer(peer);
        },
        filters: [
          {
            kinds: [EVENT_KINDS.JOIN_SPACE],
            tags: [
              [TAGS.SPACE, space.id],
              [TAGS.CREATOR, space.host.publicKey],
              [TAGS.RTC_APP, SPACES_APP],
            ],
          },
        ],
      })
    );
  }

  async _fetchPeers(space) {
    const joinSpaceEvents = await this._queryEvents({
      filters: [
        {
          kinds: [EVENT_KINDS.JOIN_SPACE],
          tags: [
            [TAGS.RTC_APP, SPACES_APP],
            [TAGS.CREATOR, space.host.publicKey],
            [TAGS.SPACE, space.id],
          ],
        },
      ],
    });

    const leaveSpaceEvents = await this._queryEvents({
      filters: [
        {
          kinds: [EVENT_KINDS.LEAVE_SPACE],
          tags: [
            [TAGS.RTC_APP, SPACES_APP],
            [TAGS.CREATOR, space.host.publicKey],
            [TAGS.SPACE, space.id],
          ],
        },
      ],
    });
    for (const event of joinSpaceEvents) {
      const peerLeftSpace = leaveSpaceEvents.includes(
        leaveEvent =>
          event.pubkey === leaveEvent.pubkey &&
          leaveEvent.created_at > event.created_at
      );
      if (peerLeftSpace) continue;
      const { networkMetrics } = JSON.parse(event.content);
      const peer = space.addNode(
        event.pubkey,
        event.pubkey,
        false,
        false,
        false,
        networkMetrics
      );
      this.subscribeLeaveSpaceEvent(peer);
    }
  }

  async _fetchPeerConnections(space) {
    const peerConnectionEvents = await this._queryEvents({
      filters: [
        {
          kinds: [EVENT_KINDS.CONFIRM_CONNECTION],
          tags: [
            [TAGS.RTC_APP, SPACES_APP],
            [TAGS.CREATOR, space.host.publicKey],
            [TAGS.SPACE, space.id],
          ],
        },
      ],
    });

    const dropConnectionEvents = await this._queryEvents({
      filters: [
        {
          kinds: [EVENT_KINDS.DROP_CONNECTION],
          tags: [
            [TAGS.RTC_APP, SPACES_APP],
            [TAGS.CREATOR, space.host.publicKey],
            [TAGS.SPACE, space.id],
          ],
        },
      ],
    });
    for (const event of peerConnectionEvents) {
      const peerId = event.tags.find(tag => tag[0] === TAGS.PEER)?.[1];
      const peerConnectionDropped = dropConnectionEvents.includes(
        dropConnectionEvent =>
          ((dropConnectionEvent.tags.find(tag => tag[0] === TAGS.PEER)?.[1] ===
            peerId &&
            event.pubkey === dropConnectionEvent.pubkey) ||
            (dropConnectionEvent.tags.find(tag => tag[0] === TAGS.PEER)?.[1] ===
              dropConnectionEvent.pubkey &&
              event.pubkey === peerId)) &&
          dropConnectionEvent.created_at > event.created_at
      );
      if (peerConnectionDropped) continue;
      const { type, networkMetrics } = JSON.parse(event.content);
      const node2 = getNode(event.pubkey);
      const node1 = getNode(peerId);
      if (!node1 || !node2) continue;
      space.addConnection(node1, node2, type, 'confirmed');
    }
  }

  startConnectionProcess(space) {
    space.prepareSpace();
    this.subscribeNewPeerEvent(space);
    this._fetchPeers(space);
    this.subscribeConfirmConnection(space);
    this.subscribeDropConnection(space);
    this.subscribeReserveConnection(space);
    this._fetchPeerConnections(space);
    space.joinSpace();
  }

  subscribeReserveConnection(space) {
    //this._verifyChannelSetup();
    space.addSubscriptionCloser(
      this._subscribe({
        onevent: event => {
          const { type, networkMetrics } = JSON.parse(event.content);
          const node1 = getNode(event.pubkey);
          const node2 = getNode(this.profile.publicKey);
          if (!node1 || !node2) return;
          if (networkMetrics) node1.networkMetrics = networkMetrics;
          const [decision, nodeToReplace] =
            space.collaborationGraph.viableNodeConnection(node1);
          if (!decision) this.dropConnection(node1, true);
          else {
            if (nodeToReplace) {
              space.disconnectPeer(nodeToReplace);
              this.dropConnection(nodeToReplace, true);
            }
            space.acceptPeerConnection(node1, type, 'accepted');
            this.subscribeOffer(node1);
            this.subscribeIceCandidateFromRemotePeer(node1);
            this.confirmConnection(node1, type);
          }
        },
        filters: [
          {
            kinds: [EVENT_KINDS.RESERVE_CONNECTION],
            tags: [
              [TAGS.SPACE, space.id],
              [TAGS.CREATOR, space.host.publicKey],
              [TAGS.PEER, this.profile.publicKey],
              [TAGS.RTC_APP, SPACES_APP],
            ],
          },
        ],
      })
    );
  }

  async reserveConnection(peer, type) {
    //this._verifyChannelSetup();
    const event = {
      pubkey: this.profile.publicKey,
      kind: EVENT_KINDS.RESERVE_CONNECTION,
      content: {
        type: type,
        networkMetrics: this.profile.networkMetrics,
      },
      tags: [
        [TAGS.PEER, peer.publicKey],
        [TAGS.SPACE, peer.space.id],
        [TAGS.CREATOR, peer.space.host.publicKey],
        [TAGS.RTC_APP, SPACES_APP],
        [
          TAGS.D,
          peer.space.id +
            '||' +
            peer.space.host.publicKey +
            '||' +
            this.profile.publicKey +
            '||' +
            peer.publicKey,
        ],
      ], // Tag to direct the message to a specific peer
    };

    await this._sendEvent(event);
  }

  async requestSpeech(space) {
    //this._verifyChannelSetup();
    await this.sendSimpleEvent(EVENT_KINDS.REQUEST_SPEECH, [
      [TAGS.SPACE, space.id],
      [TAGS.CREATOR, space.host.publicKey],
      [TAGS.RTC_APP, SPACES_APP],
    ]);
  }

  subscribeSpeechRequest(space) {
    //this._verifyChannelSetup();
    space.addSubscriptionCloser(
      this._subscribe({
        onevent: event => {
          space.addSpeechRequest(event.pubkey);
        },
        filters: [
          {
            kinds: [EVENT_KINDS.REQUEST_SPEECH],
            tags: [
              [TAGS.SPACE, space.id],
              [TAGS.CREATOR, space.host.publicKey],
              [TAGS.RTC_APP, SPACES_APP],
            ],
          },
        ],
      })
    );
  }

  async dropConnection(peer, isNodeKnownConsumer = false) {
    //this._verifyChannelSetup();
    const isNodeConsumer =
      isNodeKnownConsumer || peer.space.collaborationGraph.myConsumerNode(peer);
    const producer = isNodeConsumer ? this.profile : peer;
    const consumer = isNodeConsumer ? peer : this.profile;

    await this.sendSimpleEvent(EVENT_KINDS.DROP_CONNECTION, [
      [TAGS.PEER, peer.publicKey],
      [TAGS.SPACE, peer.space.id],
      [TAGS.CREATOR, peer.space.host.publicKey],
      [TAGS.RTC_APP, SPACES_APP],
      [
        TAGS.D,
        peer.space.id +
          '||' +
          peer.space.host.publicKey +
          '||' +
          producer.publicKey +
          '||' +
          consumer.publicKey,
      ],
    ]);
  }

  async confirmConnection(peer, type) {
    //this._verifyChannelSetup();
    const event = {
      pubkey: this.profile.publicKey,
      kind: EVENT_KINDS.CONFIRM_CONNECTION,
      content: {
        type: type,
        networkMetrics: this.profile.networkMetrics,
      },
      tags: [
        [TAGS.PEER, peer.publicKey],
        [TAGS.SPACE, peer.space.id],
        [TAGS.CREATOR, peer.space.host.publicKey],
        [TAGS.RTC_APP, SPACES_APP],
        [
          TAGS.D,
          peer.space.id +
            '||' +
            peer.space.host.publicKey +
            '||' +
            peer.publicKey +
            '||' +
            this.profile.publicKey,
        ],
      ], // Tag to direct the message to a specific peer
    };
    await this._sendEvent(event);
  }
  subscribeConfirmConnection(space) {
    //this._verifyChannelSetup();
    space.addSubscriptionCloser(
      this._subscribe({
        onevent: event => {
          const { type, networkMetrics } = JSON.parse(event.content);
          const peer = event.tags.find(tag => tag[0] === TAGS.PEER)?.[1];
          const node2 = getNode(event.pubkey);
          const node1 = getNode(peer);
          if (!node1 || !node2) return;
          if (networkMetrics) node2.networkMetrics = networkMetrics;
          if (node2.publicKey === this.profile.publicKey) return;
          else if (node1.publicKey === this.profile.publicKey) {
            node2.initConnection();
            this.subscribeAnswer(node2);
            this.subscribeIceCandidateFromRemotePeer(node2);
            node2.createOffer();
          }
          space.addConnection(node1, node2, type, 'confirmed');
        },
        filters: [
          {
            kinds: [EVENT_KINDS.CONFIRM_CONNECTION],
            tags: [
              [TAGS.SPACE, space.id],
              [TAGS.CREATOR, space.host.publicKey],
              [TAGS.RTC_APP, SPACES_APP],
            ],
          },
        ],
      })
    );
  }

  subscribeDropConnection(space) {
    //this._verifyChannelSetup();
    space.addSubscriptionCloser(
      this._subscribe({
        onevent: event => {
          if (event.pubkey === this.profile.publicKey) return;
          const peer = event.tags.find(tag => tag[0] === TAGS.PEER)?.[1];
          const node2 = getNode(event.pubkey);
          const node1 = getNode(peer);
          if (!node1 || !node2) return;
          if (node1.publicKey === this.profile.publicKey)
            this.space.disconnectPeer(node2);
          else space.removeConnection(node1, node2);
        },
        filters: [
          {
            kinds: [EVENT_KINDS.DROP_CONNECTION],
            tags: [
              [TAGS.SPACE, space.id],
              [TAGS.CREATOR, space.host.publicKey],
              [TAGS.RTC_APP, SPACES_APP],
            ],
          },
        ],
      })
    );
  }

  /** joinSpaceEvent allows users to create a join space event and broadcast it to the relays.
   *
   *
   */
  async joinSpaceEvent(space) {
    //this._verifyChannelSetup();
    const networkMetrics = await extractNetworkMetrics();
    const event = {
      pubkey: this.profile.publicKey,
      content: JSON.stringify(this.profile.getPublicData()),
      kind: EVENT_KINDS.JOIN_SPACE,
      tags: [
        [TAGS.SPACE, space.id],
        [TAGS.CREATOR, space.host.publicKey],
        [
          TAGS.D,
          space.id +
            '||' +
            space.host.publicKey +
            '||' +
            this.profile.publicKey,
        ],
        [TAGS.RTC_APP, SPACES_APP],
      ],
    };
    await this._sendEvent(event);
  }

  async sendSimpleEvent(kind, tags) {
    //this._verifyChannelSetup();
    const event = {
      pubkey: this.profile.publicKey,
      kind: kind,
      tags: tags,
    };
    await this._sendEvent(event);
  }
  /** leaveSpaceEvent allows users to create a leave space event and broadcast it to the relays.
   *
   *
   */
  async leaveSpaceEvent(space) {
    //this._verifyChannelSetup();
    await this.sendSimpleEvent(EVENT_KINDS.LEAVE_SPACE, [
      [TAGS.SPACE, space.id],
      [
        TAGS.D,
        space.id + '||' + space.host.publicKey + '||' + this.profile.publicKey,
      ],
      [TAGS.CREATOR, space.host.publicKey],
      [TAGS.RTC_APP, SPACES_APP],
    ]);
  }

  async subscribeLeaveSpaceEvent(peer) {
    // Retrieve the public key asynchronously outside of the object literal
    peer = peer.space.collaborationGraph.nodes.get(peer.publicKey);
    peer.addSubscriptionCloser(
      this._subscribe({
        onevent: event => {
          peer.space.removePeer(peer);
        },
        filters: [
          {
            authors: [peer.publicKey],
            kinds: [EVENT_KINDS.LEAVE_SPACE],
            tags: [
              [TAGS.SPACE, peer.space.id],
              [TAGS.CREATOR, peer.space.host.publicKey],
              [TAGS.RTC_APP, SPACES_APP],
            ],
          },
        ],
      })
    );
  }

  async subscribeOffer(peer) {
    // Retrieve the public key asynchronously outside of the object literal
    peer = peer.space.collaborationGraph.nodes.get(peer.publicKey);
    peer.addSubscriptionCloser(
      this._subscribe({
        onevent: event => {
          const { sdp } = JSON.parse(event.content);
          peer.acceptOffer(sdp);
        },
        filters: [
          {
            authors: [peer.publicKey],
            kinds: [EVENT_KINDS.SDP_OFFER],
            tags: [
              [TAGS.SPACE, peer.space.id],
              [TAGS.CREATOR, peer.space.host.publicKey],
              [TAGS.PEER, this.profile.publicKey],
              [TAGS.RTC_APP, SPACES_APP],
            ],
          },
        ],
      })
    );
  }

  subscribeIceCandidateFromRemotePeer(peer) {
    //this._verifyChannelSetup();
    peer = peer.space.collaborationGraph.nodes.get(peer.publicKey);
    peer.addSubscriptionCloser(
      this._subscribe({
        onevent: event => {
          const { ice } = JSON.parse(event.content);
          peer.onRemotePeerIceCandidateReceived(ice);
        },
        filters: [
          {
            authors: [peer.publicKey],
            kinds: [EVENT_KINDS.ICE_CANDIDATE],
            tags: [
              [TAGS.PEER, peer.publicKey],
              [TAGS.SPACE, peer.space.id],
              [TAGS.CREATOR, peer.space.host.publicKey],
              [TAGS.RTC_APP, SPACES_APP],
            ],
          },
        ],
      })
    );
  }

  subscribeAnswer(peer) {
    peer = peer.space.collaborationGraph.nodes.get(peer.publicKey);
    peer.addSubscriptionCloser(
      this._subscribe({
        onevent: event => {
          const { sdp } = JSON.parse(event.content);
          peer.handleAnswer(sdp);
        },
        filters: [
          {
            authors: [peer.publicKey],
            kinds: [EVENT_KINDS.SDP_ANSWER],
            tags: [
              [TAGS.SPACE, peer.space.id],
              [TAGS.CREATOR, peer.space.host.publicKey],
              [TAGS.RTC_APP, SPACES_APP],
            ],
          },
        ],
      })
    );
  }

  async publishSpace(space) {
    const event = {
      pubkey: this.profile.publicKey,
      content: JSON.stringify({
        id: space.id,
        name: space.name,
        host: this.profile.getPublicData(),
        //coHosts: space.coHosts,
      }),
      kind: EVENT_KINDS.CREATE_SPACE, // Adjust based on your defined kinds for offers
      tags: [
        //[TAGS.SPACE, space.id],
        [TAGS.RTC_APP, SPACES_APP],
        [TAGS.CREATOR, space.host.publicKey],
      ], // Tag to direct the message to a specific peer
    };
    await this._sendEvent(event);
    //this.subscribeNewPeerEvent(space, onNewPeer);
  }

  async createNewSpace(
    spaceId,
    spaceName,
    onAudioClientConnection,
    onAudioClientConnectionClosing,
    iceServers,
    onNewPeer
  ) {
    // Space creation
    const space = new Space(
      spaceId,
      spaceName,
      this.profile,
      this.profile,
      [],
      null,
      null,
      null,
      null,
      null,
      onAudioClientConnection,
      onAudioClientConnectionClosing,
      iceServers,
      onNewPeer,
      this.reserveConnection.bind(this),
      this.sendIceCandidateToRemotePeer.bind(this),
      this.sendAnswer.bind(this),
      this.sendOffer.bind(this)
    );
    startConnectionProcess(space);
    publishSpace(space);
    return space;
  }
}

export const nostrChannel = new NostrChannel();
