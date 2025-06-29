# Full Documentation

This document provides an in‑depth overview of the **nostr-spaces-tools** library. It explains the library's goals, how the main classes work together, and how to integrate the package into your own Nostr-based applications. For a low-level specification of the Nostr spaces protocol see [Nostr-Spaces.md](../package/Nostr-Spaces.md).

## Table of Contents

- [Purpose](#purpose)
- [Installation](#installation)
- [Library Overview](#library-overview)
- [Usage Guide](#usage-guide)
- [API Reference](#api-reference)
- [Event Kinds](#event-kinds)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## Purpose

`nostr-spaces-tools` provides the building blocks to create real-time audio rooms, similar to Twitter/X spaces, using the [Nostr protocol](https://github.com/nostr-protocol/nostr) for signalling. It exposes a simple API that allows applications to create spaces, manage peers and establish WebRTC connections without relying on centralised servers.

## Installation

Install the package from npm:

```bash
npm install nostr-spaces-tools
```

If you are working on the repository directly, install the dependencies in the `package` directory:

```bash
cd package
npm install
```

## Library Overview

The project is written in modern JavaScript and distributed as an ES module. The main classes are located in `package/classes`:

- **NostrChannel** – Singleton that manages publication and subscription of Nostr events. It is responsible for exchanging SDP offers, answers and ICE candidates, as well as higher level space events.
- **Space** – Represents an audio room. A Space keeps track of peers, their roles (host, co-host, speaker, listener) and the WebRTC connections between them.
- **Peer** – Encapsulates a participant in a space. Stores cryptographic keys, profile data and connection state.
- **Profile** – Convenience wrapper that bundles user keys, chosen relays and network metrics. Used when opening a Nostr channel.
- **Connection** – Helper class for managing individual WebRTC connections between peers.
- **CollaborationGraph** – Maintains a graph of peers and scores them using bandwidth metrics so the best candidate is chosen for relaying audio.

These building blocks can be imported from the package root:

```javascript
import {
  CollaborationGraph,
  Connection,
  NostrChannel,
  Peer,
  Profile,
  Space,
  extractNetworkMetrics,
} from 'nostr-spaces-tools';
```

## Usage Guide

1. **Create a profile and open a channel**

   ```javascript
   const metrics = await extractNetworkMetrics();
   const profile = new Profile({
     name: 'Alice',
     publicKey: '<hex public key>',
     privateKey: '<hex private key>',
     relays: ['wss://relay.damus.io'],
     networkMetrics: metrics,
   });

   const nostrChannel = new NostrChannel();
   nostrChannel.openChannel(profile.relays, profile);
   ```

2. **Create a space**

   ```javascript
   const space = await nostrChannel.createNewSpace(
     'space-id',
     'My first space',
     () => console.log('connected'),
     () => console.log('closed'),
     [{ urls: 'stun:stun.l.google.com:19302' }],
     peer => console.log('joined', peer.publicKey)
   );
   ```

3. **Join a space**

   ```javascript
   const spaces = await nostrChannel.fetchActiveSpaces();
   nostrChannel.startConnectionProcess(spaces[0]);
   ```

4. **Request the microphone**

   ```javascript
   nostrChannel.requestSpeech(space);
   ```

See `README.md` for shorter examples and `Nostr-Spaces.md` for the exact event flow.

## API Reference

The following sections summarise the most important methods. Parameters that expect callbacks generally receive events from WebRTC or Nostr and should handle them asynchronously.

### `NostrChannel`

- `openChannel(relays, profile)` – Connects to the provided relays and prepares the channel for publishing events.
- `createNewSpace(id, name, onConnect, onClose, iceServers, onJoin)` – Creates and publishes a new space. Returns the created `Space` instance.
- `fetchActiveSpaces()` – Fetches currently active spaces from the configured relays.
- `startConnectionProcess(space)` – Joins the specified space and begins the WebRTC handshake with peers.
- `requestSpeech(space)` – Sends an event requesting to become a speaker.

### `Space`

- `addPeer(peer)` – Adds a peer to the space.
- `removePeer(peer)` – Removes a peer and closes any connections.
- `broadcast(kind, content)` – Broadcasts a Nostr event to all peers in the space.

### `Peer`

- `connect(otherPeer)` – Creates a direct WebRTC connection to another peer.
- `disconnect(otherPeer)` – Drops the WebRTC connection.

### `CollaborationGraph`

- `addPeer(peer)` – Inserts a new peer into the graph and assigns initial metrics.
- `scorePeer(peer)` – Updates the peer score using bandwidth measurements.
- `getBestPeer()` – Returns the peer with the highest score, useful for selecting relays.

## Event Kinds

Events exchanged over Nostr follow specific kind numbers so that relays can filter them efficiently. The most common kinds are:

- `1000` – `CREATE_SPACE`
- `1001` – `CLOSE_SPACE`
- `21102` – `SDP_OFFER`
- `21103` – `SDP_ANSWER`
- `21104` – `ICE_CANDIDATE`
- `21105` – `REQUEST_SPEECH` / `PROPOSE_SPEECH`
- `31101` – `JOIN_SPACE`
- `31102` – `LEAVE_SPACE`
- `31103` – `RESERVE_CONNECTION`
- `31104` – `CONFIRM_CONNECTION`
- `31105` – `DROP_CONNECTION`
- `31106` – `REMOVE_PEER`
- `31107` – `PROMOTE_SPEAKER`
- `31108` – `PROMOTE_COHOST`
- `31109` – `DEMOTE_TO_PEER`

Refer to `package/Nostr-Spaces.md` for a comprehensive description of each event and its fields.

## Testing

Run the Jest test suite from inside the `package` directory:

```bash
cd package
npm install
npm test --silent
```

The tests exercise the main classes and ensure that the scoring and signalling behaviour remain consistent.

## Contributing

We encourage contributions from the community. If you would like to add a feature or fix a bug:

1. Fork this repository and create your feature branch from `main`.
2. Install dependencies and run the test suite with `npm test --silent` inside the `package` directory.
3. Ensure `npm run build` completes without errors.
4. Open a pull request describing your changes and reference any related issues.

Please use the issue templates under `.github/ISSUE_TEMPLATE` and adhere to our
[Code of Conduct](../CODE_OF_CONDUCT.md).

Detailed guidelines can be found in [CONTRIBUTING.md](../CONTRIBUTING.md).

## License

This project is released under the [MIT License](../LICENSE).
